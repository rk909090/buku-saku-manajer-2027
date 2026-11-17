import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { ensureSchema, getPool, isDbConfigured } from "@/lib/db";
import { env } from "@/lib/shop/env";
import { confirmPaymentFromXendit } from "@/lib/shop/orders";

/**
 * Webhook Xendit (Payment Sessions): event `payment_session.completed` / `payment_session.expired`.
 * 1. Verifikasi header `x-callback-token` = XENDIT_WEBHOOK_TOKEN (dari dashboard Xendit).
 * 2. Simpan & dedupe (header webhook-id bila ada; kalau tidak, event + session id).
 * 3. Status TIDAK diambil dari isi webhook: dikonfirmasi ulang lewat GET /sessions/{id}.
 * Selalu balas 200 untuk event yang sah agar Xendit tidak mengulang tanpa perlu.
 */
export async function POST(request: NextRequest) {
  const expected = env.xenditWebhookToken();
  const given = request.headers.get("x-callback-token") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("invalid token", { status: 401 });
  }
  if (!isDbConfigured()) return new Response("db not configured", { status: 503 });

  const raw = await request.text();
  if (raw.length > 100_000) return new Response("too large", { status: 413 });
  let body: { event?: string; data?: { payment_session_id?: string; reference_id?: string } };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const event = String(body.event || "");
  const sessionId = String(body.data?.payment_session_id || "");

  await ensureSchema();
  const pool = getPool();
  const dedupe = (request.headers.get("webhook-id") || `${event}:${sessionId}`).slice(0, 190);
  await pool.query(
    "INSERT IGNORE INTO webhook_events (provider, dedupe_key, event, payload) VALUES ('xendit', ?, ?, ?)",
    [dedupe, event.slice(0, 64), raw]
  );

  if ((event === "payment_session.completed" || event === "payment_session.expired") && /^ps-[A-Za-z0-9]+$/.test(sessionId)) {
    try {
      const r = await confirmPaymentFromXendit(sessionId, "xendit-webhook");
      if (!r.ok) console.warn("[xendit webhook]", event, sessionId, r.reason);
    } catch (e) {
      // Gagal konfirmasi (mis. jaringan): balas 500 agar Xendit mengirim ulang.
      console.error("[xendit webhook] konfirmasi gagal", (e as Error).message);
      return new Response("retry", { status: 500 });
    }
  }
  return new Response("ok", { status: 200 });
}
