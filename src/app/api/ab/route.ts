import type { NextRequest } from "next/server";
import { ensureSchema, getPool, isDbConfigured } from "@/lib/db";
import {
  AB_EVENTS,
  AB_EXPERIMENT,
  AB_PLACEMENTS,
  AB_VISITOR_COOKIE,
  isAbVariant,
  type AbEventName,
} from "@/lib/ab-config";

/**
 * Menerima event A/B dari browser (navigator.sendBeacon / fetch keepalive)
 * dan menyimpannya ke tabel MySQL `ab_events`.
 * Yang disimpan: eksperimen, varian, nama event, posisi CTA, ID pengunjung anonim,
 * penanda pratinjau (forced), dan jenis perangkat. TIDAK menyimpan IP atau user-agent.
 */
const MAX_BODY = 1024;
/** Domain produksi; selalu diizinkan sebagai Origin. */
const SITE_HOST = "bsm.humplus.com";
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|curl|wget|python|httpclient/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  // Hanya dari halaman ini sendiri. Dibandingkan dengan header Host/X-Forwarded-Host,
  // karena di belakang reverse proxy Hostinger request.nextUrl.origin bukan domain publik.
  if (!isSameOrigin(request)) {
    return new Response(null, { status: 403 });
  }

  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT_RE.test(ua)) return new Response(null, { status: 204 }); // abaikan bot, tanpa error

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

  if (!isDbConfigured()) {
    console.warn("[A/B] Event diterima tetapi DB belum dikonfigurasi; tidak disimpan.");
    return new Response(null, { status: 503 });
  }

  const vid = request.cookies.get(AB_VISITOR_COOKIE)?.value;
  const visitorId = vid && UUID_RE.test(vid) ? vid : null;
  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";

  try {
    await ensureSchema();
    await getPool().execute(
      `INSERT INTO ab_events (experiment, variant, event, placement, visitor_id, forced, device)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [e.experiment, e.variant, e.event, e.placement, visitorId, e.forced ? 1 : 0, device]
    );
  } catch (err) {
    console.error("[A/B] Gagal menyimpan event:", (err as Error).message);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 204 });
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

function parseEvent(b: unknown) {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  if (o.experiment !== AB_EXPERIMENT) return null;
  if (typeof o.variant !== "string" || !isAbVariant(o.variant)) return null;
  if (typeof o.event !== "string" || !(AB_EVENTS as readonly string[]).includes(o.event)) return null;
  const event = o.event as AbEventName;

  let placement: string | null = null;
  if (event === "ab_cta_click") {
    if (typeof o.placement !== "string" || !(AB_PLACEMENTS as readonly string[]).includes(o.placement)) return null;
    placement = o.placement;
  }
  return { experiment: AB_EXPERIMENT, variant: o.variant, event, placement, forced: o.forced === true };
}
