import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { ensureSchema, getPool, isDbConfigured } from "@/lib/db";
import { AB_EXPERIMENT, AB_VARIANTS } from "@/lib/ab-config";

/**
 * Ringkasan hasil A/B test (JSON). Dilindungi token dari env AB_STATS_TOKEN.
 * Akses: header "Authorization: Bearer <token>" atau ?token=<token>.
 * Event pratinjau (forced = 1, dari ?hl=) dihitung terpisah dan TIDAK masuk hasil.
 */
type Row = {
  variant: string;
  views: number;
  visitors: number;
  clicks: number;
  clickers: number;
};

export async function GET(request: NextRequest) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return Response.json({ error: "database belum dikonfigurasi" }, { status: 503 });

  const experiment = request.nextUrl.searchParams.get("experiment") || AB_EXPERIMENT;

  try {
    await ensureSchema();
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT variant,
              CAST(SUM(event = 'ab_headline_view') AS UNSIGNED)                                   AS views,
              COUNT(DISTINCT CASE WHEN event = 'ab_headline_view' THEN visitor_id END)            AS visitors,
              CAST(SUM(event = 'ab_cta_click') AS UNSIGNED)                                       AS clicks,
              COUNT(DISTINCT CASE WHEN event = 'ab_cta_click' THEN visitor_id END)                AS clickers
         FROM ab_events
        WHERE experiment = ? AND forced = 0
        GROUP BY variant`,
      [experiment]
    );
    const [placements] = await pool.query(
      `SELECT variant, placement, COUNT(*) AS clicks
         FROM ab_events
        WHERE experiment = ? AND forced = 0 AND event = 'ab_cta_click'
        GROUP BY variant, placement
        ORDER BY variant, clicks DESC`,
      [experiment]
    );
    const [devices] = await pool.query(
      `SELECT variant, device,
              COUNT(DISTINCT CASE WHEN event = 'ab_headline_view' THEN visitor_id END) AS visitors,
              COUNT(DISTINCT CASE WHEN event = 'ab_cta_click' THEN visitor_id END)     AS clickers
         FROM ab_events
        WHERE experiment = ? AND forced = 0
        GROUP BY variant, device
        ORDER BY variant, device`,
      [experiment]
    );
    const [[range]] = (await pool.query(
      `SELECT MIN(created_at) AS first_event, MAX(created_at) AS last_event,
              CAST(SUM(forced = 1) AS UNSIGNED) AS preview_events_excluded
         FROM ab_events WHERE experiment = ?`,
      [experiment]
    )) as unknown as [[Record<string, unknown>]];

    const byVariant = new Map((rows as Row[]).map((r) => [r.variant, normalize(r)]));
    const control = byVariant.get(AB_VARIANTS[0]);
    const variants = AB_VARIANTS.map((id) => {
      const r = byVariant.get(id) ?? { variant: id, views: 0, visitors: 0, clicks: 0, clickers: 0 };
      const rate = r.visitors ? r.clickers / r.visitors : 0;
      return {
        ...r,
        conversion_rate: round(rate),
        vs_control: id === AB_VARIANTS[0] || !control ? null : compare(control, r),
      };
    });

    return Response.json(
      {
        experiment,
        note: "conversion_rate = pengunjung unik yang klik CTA Shopee / pengunjung unik yang melihat headline. Event pratinjau (?hl=) tidak dihitung.",
        ...range,
        variants,
        clicks_by_placement: placements,
        by_device: devices,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[A/B stats]", (err as Error).message);
    return Response.json({ error: "gagal membaca database" }, { status: 500 });
  }
}

function authorized(request: NextRequest) {
  const expected = process.env.AB_STATS_TOKEN;
  if (!expected || expected.length < 16) return false;
  const header = request.headers.get("authorization");
  const given = header?.startsWith("Bearer ") ? header.slice(7) : request.nextUrl.searchParams.get("token") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalize(r: Row): Row {
  return {
    variant: r.variant,
    views: Number(r.views),
    visitors: Number(r.visitors),
    clicks: Number(r.clicks),
    clickers: Number(r.clickers),
  };
}

/** Uji dua proporsi (z-test) varian vs kontrol. Hanya indikasi; butuh sampel cukup. */
function compare(a: Row, b: Row) {
  if (!a.visitors || !b.visitors) return { uplift: null, z: null, p_value: null, enough_data: false };
  const p1 = a.clickers / a.visitors;
  const p2 = b.clickers / b.visitors;
  const pooled = (a.clickers + b.clickers) / (a.visitors + b.visitors);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / a.visitors + 1 / b.visitors));
  const z = se ? (p2 - p1) / se : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const enough = Math.min(a.visitors, b.visitors) >= 100 && a.clickers + b.clickers >= 20;
  return {
    uplift: p1 ? round((p2 - p1) / p1) : null,
    z: round(z),
    p_value: round(p),
    significant_95: enough && p < 0.05,
    enough_data: enough,
  };
}

function normalCdf(x: number) {
  // Abramowitz-Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * (x / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(x * x) / 2);
  return 0.5 * (1 + y);
}

function round(n: number) {
  return Math.round(n * 10000) / 10000;
}
