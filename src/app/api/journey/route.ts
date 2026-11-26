import type { NextRequest } from "next/server";
import { ensureSchema, getPool, isDbConfigured } from "@/lib/db";
import { AB_VISITOR_COOKIE, isAbVariant } from "@/lib/ab-config";
import { classifyChannel, sanitizeTouch } from "@/lib/attribution";
import { JOURNEY_EVENTS, JOURNEY_PATHS, SECTION_IDS, type JourneyEvent } from "@/lib/journey-config";
import { clientIp, rateLimited } from "@/lib/shop/http";
import { ADMIN_COOKIE } from "@/lib/shop/auth";

/**
 * Menerima event perjalanan pengunjung dari browser (sendBeacon / fetch keepalive) → tabel `site_sessions`
 * (satu baris per sesi) dan `site_events` (satu baris per langkah).
 * Anonim: ID pengunjung acak (cookie bsm_vid) + ID sesi acak dari browser. TIDAK menyimpan IP/user-agent.
 * Sesi ditandai internal bila pratinjau (?hl=) atau browser sedang login dashboard admin.
 */
const MAX_BODY = 2048;
const SITE_HOST = "bsm.humplus.com";
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|curl|wget|python|httpclient/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DETAIL_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT_RE.test(ua)) return new Response(null, { status: 204 });
  if (rateLimited(`journey:${clientIp(request)}`, 300, 10 * 60_000)) return new Response(null, { status: 429 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const e = parseEvent(body);
  if (!e) return new Response(null, { status: 400 });
  if (!isDbConfigured()) return new Response(null, { status: 503 });

  const vid = request.cookies.get(AB_VISITOR_COOKIE)?.value;
  const visitorId = vid && UUID_RE.test(vid) ? vid : null;
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
  const internal = e.forced || !!request.cookies.get(ADMIN_COOKIE)?.value ? 1 : 0;
  const t = e.touch;

  try {
    await ensureSchema();
    const pool = getPool();
    // Satu upsert untuk semua event: baris sesi dibuat bila belum ada; data atribusi diisi sekali (COALESCE).
    await pool.execute(
      `INSERT INTO site_sessions (id, visitor_id, device, internal, ab_variant, channel, utm_source, utm_medium, utm_campaign,
          utm_term, utm_content, click_id_type, referrer_host, landing_path, page_views, events, max_scroll, engaged_s)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE
          last_seen = CURRENT_TIMESTAMP(3),
          events = events + 1,
          page_views = page_views + VALUES(page_views),
          max_scroll = GREATEST(max_scroll, VALUES(max_scroll)),
          engaged_s = LEAST(engaged_s + VALUES(engaged_s), 86400),
          internal = GREATEST(internal, VALUES(internal)),
          visitor_id = COALESCE(visitor_id, VALUES(visitor_id)),
          ab_variant = COALESCE(ab_variant, VALUES(ab_variant)),
          channel = COALESCE(channel, VALUES(channel)),
          utm_source = COALESCE(utm_source, VALUES(utm_source)),
          utm_medium = COALESCE(utm_medium, VALUES(utm_medium)),
          utm_campaign = COALESCE(utm_campaign, VALUES(utm_campaign)),
          utm_term = COALESCE(utm_term, VALUES(utm_term)),
          utm_content = COALESCE(utm_content, VALUES(utm_content)),
          click_id_type = COALESCE(click_id_type, VALUES(click_id_type)),
          referrer_host = COALESCE(referrer_host, VALUES(referrer_host)),
          landing_path = COALESCE(landing_path, VALUES(landing_path))`,
      [
        e.sid,
        visitorId,
        device,
        internal,
        e.ab,
        t ? classifyChannel(t) : null,
        t?.source ?? null,
        t?.medium ?? null,
        t?.campaign ?? null,
        t?.term ?? null,
        t?.content ?? null,
        t?.clickIdType ?? null,
        t?.referrerHost ?? null,
        t?.landingPath ?? null,
        e.event === "page_view" ? 1 : 0,
        e.event === "scroll" ? e.value ?? 0 : 0,
        e.event === "page_leave" ? e.value ?? 0 : 0,
      ]
    );
    await pool.execute("INSERT INTO site_events (session_id, event, path, detail, value) VALUES (?, ?, ?, ?, ?)", [
      e.sid,
      e.event,
      e.path,
      e.detail,
      e.value,
    ]);
  } catch (err) {
    console.error("[journey] gagal menyimpan:", (err as Error).message);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 204 });
}

function parseEvent(b: unknown) {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  if (typeof o.sid !== "string" || !UUID_RE.test(o.sid)) return null;
  if (typeof o.e !== "string" || !(JOURNEY_EVENTS as readonly string[]).includes(o.e)) return null;
  const event = o.e as JourneyEvent;
  const path = typeof o.p === "string" && (JOURNEY_PATHS as readonly string[]).includes(o.p) ? o.p : null;
  if (!path) return null;

  let detail: string | null = typeof o.d === "string" && DETAIL_RE.test(o.d) ? o.d : null;
  if (event === "section_view" && (!detail || !SECTION_IDS.includes(detail))) return null;
  if (["cta_click", "preview_open", "faq_open"].includes(event) && !detail) detail = null;

  let value: number | null = typeof o.v === "number" && Number.isFinite(o.v) ? Math.round(o.v) : null;
  if (event === "scroll" && (value == null || ![25, 50, 75, 100].includes(value))) return null;
  if (event === "page_leave") value = Math.max(0, Math.min(value ?? 0, 1800)); // maks. 30 menit per laporan
  if (!["scroll", "page_leave"].includes(event)) value = null;

  const touch = event === "session_start" ? sanitizeTouch(o.t) : null;
  if (event === "session_start" && !touch) return null;
  const ab = typeof o.ab === "string" && isAbVariant(o.ab) ? o.ab : null;
  return { sid: o.sid.toLowerCase(), event, path, detail, value, touch, ab, forced: o.f === true };
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // sendBeacon same-origin kadang tanpa header Origin
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const hosts = [SITE_HOST, request.headers.get("x-forwarded-host"), request.headers.get("host")]
    .flatMap((h) => (h ? h.split(",") : []))
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return hosts.includes(originHost);
}
