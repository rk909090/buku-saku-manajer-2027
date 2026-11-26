import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { ensureSchema, getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { sourceLabel } from "@/lib/attribution";
import { LANDING_SECTIONS, sectionLabel } from "@/lib/journey-config";
import { buildInsights, FUNNEL_STEPS, type Agg, type Segment } from "@/lib/journey-insights";

const PAID = ["paid", "processing", "shipped", "completed"];
const MAX_SESSIONS = 20000;
const PAID_CHANNELS = ["Iklan Google", "Iklan Meta", "Iklan TikTok", "Iklan lainnya"];

type SessionRow = {
  id: string;
  visitor_id: string | null;
  started_at: Date;
  device: string | null;
  channel: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  click_id_type: string | null;
  referrer_host: string | null;
  engaged_s: number;
  max_scroll: number;
  landing: number;
  cta: number;
  checkout: number;
  shipping: number;
  pay: number;
  wa: number;
  preview: number;
};
type OrderRow = { id: number; order_number: string; status: string; total: number; session_id: string | null; visitor_id: string | null; channel: string | null; created_at: Date };

const empty = (): Agg => ({ sessions: 0, engaged: 0, intent: 0, checkout: 0, shipping: 0, pay: 0, orders: 0, paid: 0, revenue: 0 });

/**
 * Ringkasan perjalanan pengunjung untuk dashboard. ?days=7|30|90 (default 30), ?internal=1 ikut menghitung
 * kunjungan internal (pratinjau ?hl= & browser admin). Pesanan dihubungkan ke sesi lewat session_id
 * (sejak 26 Nov 2026) atau, bila kosong, sesi terakhir pengunjung yang sama sebelum pesanan dibuat.
 */
export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const sp = request.nextUrl.searchParams;
    const days = [7, 30, 90].includes(Number(sp.get("days"))) ? Number(sp.get("days")) : 30;
    const withInternal = sp.get("internal") === "1";
    await ensureSchema();
    const pool = getPool();
    const where = `s.started_at >= NOW(3) - INTERVAL ${days} DAY${withInternal ? "" : " AND s.internal = 0"}`;

    const [sessions] = await pool.query<(RowDataPacket & SessionRow)[]>(
      `SELECT s.id, s.visitor_id, s.started_at, s.device, s.channel, s.utm_source, s.utm_medium, s.utm_campaign, s.utm_content,
              s.click_id_type, s.referrer_host, s.engaged_s, s.max_scroll,
              MAX(e.event = 'page_view' AND e.path = '/') AS landing,
              MAX(e.event = 'cta_click') AS cta,
              MAX(e.event = 'begin_checkout') AS checkout,
              MAX(e.event = 'shipping_selected') AS shipping,
              MAX(e.event = 'pay_click') AS pay,
              MAX(e.event = 'whatsapp_click') AS wa,
              MAX(e.event = 'preview_open') AS preview
         FROM site_sessions s LEFT JOIN site_events e ON e.session_id = s.id
        WHERE ${where}
        GROUP BY s.id
        ORDER BY s.started_at DESC
        LIMIT ${MAX_SESSIONS + 1}`
    );
    const truncated = sessions.length > MAX_SESSIONS;
    if (truncated) sessions.length = MAX_SESSIONS;

    // Pesanan pada periode yang sama (termasuk yang belum/tidak dibayar).
    const [orders] = await pool.query<(RowDataPacket & OrderRow)[]>(
      `SELECT id, order_number, status, total, session_id, visitor_id, channel, created_at
         FROM orders WHERE created_at >= NOW(3) - INTERVAL ${days} DAY ORDER BY created_at`
    );

    // Hubungkan pesanan → sesi.
    const byId = new Map<string, SessionRow>(sessions.map((s) => [s.id, s]));
    const byVisitor = new Map<string, SessionRow[]>();
    for (const s of [...sessions].sort((a, b) => +a.started_at - +b.started_at)) {
      if (!s.visitor_id) continue;
      const list = byVisitor.get(s.visitor_id) ?? [];
      list.push(s);
      byVisitor.set(s.visitor_id, list);
    }
    const ordersBySession = new Map<string, OrderRow[]>();
    for (const o of orders) {
      let s = o.session_id ? byId.get(o.session_id) : undefined;
      if (!s && o.visitor_id) s = (byVisitor.get(o.visitor_id) ?? []).filter((x) => +x.started_at <= +o.created_at).at(-1);
      if (!s) continue;
      const list = ordersBySession.get(s.id) ?? [];
      list.push(o);
      ordersBySession.set(s.id, list);
    }

    // Agregasi per sesi.
    const flags = (s: SessionRow) => {
      const os = ordersBySession.get(s.id) ?? [];
      const paidOs = os.filter((o) => PAID.includes(o.status));
      const engaged = s.engaged_s >= 10 || s.max_scroll >= 50 || !!s.cta || !!s.checkout || !!s.preview || !!s.wa;
      return {
        engaged,
        intent: !!s.cta || !!s.checkout,
        checkout: !!s.checkout,
        shipping: !!s.shipping,
        pay: !!s.pay,
        orders: os.length > 0,
        paid: paidOs.length > 0,
        revenue: paidOs.reduce((n, o) => n + Number(o.total), 0),
      };
    };
    const add = (a: Agg, f: ReturnType<typeof flags>) => {
      a.sessions++;
      if (f.engaged) a.engaged++;
      if (f.intent) a.intent++;
      if (f.checkout) a.checkout++;
      if (f.shipping) a.shipping++;
      if (f.pay) a.pay++;
      if (f.orders) a.orders++;
      if (f.paid) a.paid++;
      a.revenue += f.revenue;
    };
    const totals = empty();
    const seg = { channel: new Map<string, Segment>(), source: new Map<string, Segment>(), campaign: new Map<string, Segment>(), content: new Map<string, Segment>(), device: new Map<string, Segment>() };
    const bump = (m: Map<string, Segment>, key: string, label: string, f: ReturnType<typeof flags>) => {
      const cur = m.get(key) ?? { ...empty(), key, label };
      add(cur, f);
      m.set(key, cur);
    };
    let preview = 0;
    let previewIntent = 0;
    let whatsapp = 0;
    let clickIdWithoutUtm = 0;
    let paidChannelSessions = 0;
    const engagedList: number[] = [];
    let scrollSum = 0;
    const daily = new Map<string, { day: string; sessions: number; intent: number; orders: number; paid: number }>();

    for (const s of sessions) {
      const f = flags(s);
      add(totals, f);
      const ch = s.channel || "Tidak diketahui";
      bump(seg.channel, ch, ch, f);
      const src = sourceLabel({ source: s.utm_source, medium: s.utm_medium, referrerHost: s.referrer_host, clickIdType: s.click_id_type });
      bump(seg.source, src, src, f);
      if (s.utm_campaign) bump(seg.campaign, s.utm_campaign, s.utm_campaign, f);
      if (s.utm_content) bump(seg.content, `${s.utm_campaign || "-"}|${s.utm_content}`, `${s.utm_campaign || "(tanpa kampanye)"} · ${s.utm_content}`, f);
      const dev = s.device || "lainnya";
      bump(seg.device, dev, dev === "mobile" ? "Ponsel" : dev === "desktop" ? "Desktop" : dev === "tablet" ? "Tablet" : "Lainnya", f);
      if (s.preview) {
        preview++;
        if (f.intent) previewIntent++;
      }
      if (s.wa) whatsapp++;
      if (s.click_id_type && !s.utm_campaign) clickIdWithoutUtm++;
      if (PAID_CHANNELS.includes(ch)) paidChannelSessions++;
      engagedList.push(Number(s.engaged_s));
      scrollSum += Number(s.max_scroll);
      const day = new Date(+s.started_at + 7 * 3600e3).toISOString().slice(0, 10);
      const dd = daily.get(day) ?? { day, sessions: 0, intent: 0, orders: 0, paid: 0 };
      dd.sessions++;
      if (f.intent) dd.intent++;
      daily.set(day, dd);
    }
    for (const o of orders) {
      const day = new Date(+o.created_at + 7 * 3600e3).toISOString().slice(0, 10);
      const dd = daily.get(day) ?? { day, sessions: 0, intent: 0, orders: 0, paid: 0 };
      dd.orders++;
      if (PAID.includes(o.status)) dd.paid++;
      daily.set(day, dd);
    }
    engagedList.sort((a, b) => a - b);
    const median = engagedList.length ? engagedList[Math.floor((engagedList.length - 1) / 2)] : 0;

    // Seksi landing: jangkauan & seksi terakhir yang terlihat (sesi landing tanpa minat beli).
    const ids = sessions.map((s) => s.id);
    const reach = new Map<string, number>();
    const exits = new Map<string, number>();
    if (ids.length) {
      for (let i = 0; i < ids.length; i += 2000) {
        const chunk = ids.slice(i, i + 2000);
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT session_id, detail, id FROM site_events WHERE event = 'section_view' AND session_id IN (?) ORDER BY id`,
          [chunk]
        );
        const last = new Map<string, string>();
        for (const r of rows) {
          reach.set(r.detail, (reach.get(r.detail) ?? 0) + 1);
          last.set(r.session_id, r.detail);
        }
        for (const [sid, detail] of last) {
          const s = byId.get(sid);
          if (s && !s.cta && !s.checkout) exits.set(detail, (exits.get(detail) ?? 0) + 1);
        }
      }
    }
    const landingSessions = sessions.filter((s) => s.landing).length;
    const landingNoIntent = sessions.filter((s) => s.landing && !s.cta && !s.checkout).length;

    // Pesanan per atribusi pesanan (last non-direct) + yang belum dibayar sekarang.
    const orderByChannel = new Map<string, { key: string; orders: number; paid: number; revenue: number; pending: number }>();
    for (const o of orders) {
      const k = o.channel || "Belum tercatat";
      const cur = orderByChannel.get(k) ?? { key: k, orders: 0, paid: 0, revenue: 0, pending: 0 };
      cur.orders++;
      if (PAID.includes(o.status)) {
        cur.paid++;
        cur.revenue += Number(o.total);
      }
      if (o.status === "pending_payment") cur.pending++;
      orderByChannel.set(k, cur);
    }
    const [[pend]] = (await pool.query(
      "SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS v FROM orders WHERE status = 'pending_payment' AND (payment_expires_at IS NULL OR payment_expires_at > NOW(3))"
    )) as unknown as [[{ n: number; v: number }]];

    // Perjalanan terbaru (50 sesi) beserta langkahnya.
    const recentIds = sessions.slice(0, 50).map((s) => s.id);
    const stepsBySession = new Map<string, { event: string; path: string | null; detail: string | null; value: number | null; at: Date }[]>();
    if (recentIds.length) {
      const [ev] = await pool.query<RowDataPacket[]>(
        `SELECT session_id, event, path, detail, value, created_at FROM site_events WHERE session_id IN (?) ORDER BY id`,
        [recentIds]
      );
      for (const r of ev) {
        const list = stepsBySession.get(r.session_id) ?? [];
        list.push({ event: r.event, path: r.path, detail: r.detail, value: r.value, at: r.created_at });
        stepsBySession.set(r.session_id, list);
      }
    }
    const recent = sessions.slice(0, 50).map((s) => ({
      id: s.id,
      startedAt: s.started_at,
      channel: s.channel || "Tidak diketahui",
      source: sourceLabel({ source: s.utm_source, medium: s.utm_medium, referrerHost: s.referrer_host, clickIdType: s.click_id_type }),
      campaign: s.utm_campaign,
      content: s.utm_content,
      device: s.device,
      engagedS: Number(s.engaged_s),
      maxScroll: Number(s.max_scroll),
      steps: stepsBySession.get(s.id) ?? [],
      orders: (ordersBySession.get(s.id) ?? []).map((o) => ({ id: o.id, number: o.order_number, status: o.status, total: Number(o.total) })),
    }));

    const sortSeg = (m: Map<string, Segment>, limit = 30) => [...m.values()].sort((a, b) => b.sessions - a.sessions).slice(0, limit);
    const channels = sortSeg(seg.channel);
    const campaigns = sortSeg(seg.campaign);
    const devices = sortSeg(seg.device);
    const exitsArr = [...exits.entries()].map(([id, n]) => ({ id, label: sectionLabel(id), n })).sort((a, b) => b.n - a.n);
    const ordersUnattributed = orders.filter((o) => !o.channel).length;

    const insights = buildInsights({
      days,
      totals: { ...totals, avgEngaged: engagedList.length ? Math.round(engagedList.reduce((a, b) => a + b, 0) / engagedList.length) : 0, medianEngaged: median, preview, previewIntent, whatsapp },
      channels,
      campaigns,
      devices,
      exits: exitsArr,
      landingNoIntent,
      clickIdWithoutUtm,
      paidChannelSessions,
      pendingNow: { count: Number(pend.n), value: Number(pend.v) },
      ordersUnattributed,
      ordersTotal: orders.length,
    });

    return json({
      days,
      withInternal,
      truncated,
      totals: {
        ...totals,
        visitors: new Set(sessions.map((s) => s.visitor_id || s.id)).size,
        avgEngaged: engagedList.length ? Math.round(engagedList.reduce((a, b) => a + b, 0) / engagedList.length) : 0,
        medianEngaged: median,
        avgScroll: sessions.length ? Math.round(scrollSum / sessions.length) : 0,
        preview,
        whatsapp,
        landingSessions,
      },
      funnel: FUNNEL_STEPS.map((s) => ({ key: s.key, label: s.label, count: totals[s.key] })),
      channels,
      sources: sortSeg(seg.source, 15),
      campaigns,
      contents: sortSeg(seg.content, 15),
      devices,
      sections: LANDING_SECTIONS.map((s) => ({ id: s.id, label: s.label, reached: reach.get(s.id) ?? 0 })),
      landingNoIntent,
      exits: exitsArr,
      ordersAttribution: {
        total: orders.length,
        unattributed: ordersUnattributed,
        byChannel: [...orderByChannel.values()].sort((a, b) => b.orders - a.orders),
        linkedToSession: [...ordersBySession.values()].reduce((n, l) => n + l.length, 0),
      },
      pendingNow: { count: Number(pend.n), value: Number(pend.v) },
      daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)),
      recent,
      insights,
    });
  });
}
