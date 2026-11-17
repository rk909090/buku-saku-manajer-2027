import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { ensureSchema, getPool, isDbConfigured } from "@/lib/db";
import { clientIp, errorResponse, json, rateLimited } from "@/lib/shop/http";
import { confirmPaymentFromXendit } from "@/lib/shop/orders";

/**
 * Status pesanan untuk pembeli. Akses butuh token rahasia per pesanan (?t=), yang hanya
 * ada di link kembali dari Xendit. Bila masih menunggu pembayaran, status dicek ulang
 * langsung ke Xendit (maks. sekali per 10 detik per pesanan) — tidak bergantung pada redirect.
 */
const lastCheck = new Map<string, number>();

export async function GET(request: NextRequest, ctx: RouteContext<"/api/shop/orders/[number]">) {
  if (!isDbConfigured()) return json({ error: "Toko belum siap" }, 503);
  const { number } = await ctx.params;
  const token = request.nextUrl.searchParams.get("t") || "";
  if (!/^BSM[0-9A-F]{12}$/.test(number) || !/^[0-9a-f]{32}$/.test(token)) return json({ error: "not_found" }, 404);
  if (rateLimited(`status:${clientIp(request)}`, 60, 60_000)) return json({ error: "Terlalu banyak permintaan" }, 429);
  try {
    await ensureSchema();
    const pool = getPool();
    const load = async () => {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id, order_number, public_token, status, subtotal, shipping_cost, total, courier_name, courier_service_name,
                shipping_etd, recipient_name, area_name, payment_link_url, payment_expires_at, xendit_session_id,
                paid_at, tracking_number, created_at
           FROM orders WHERE order_number = ? LIMIT 1`,
        [number]
      );
      return rows[0];
    };
    let o = await load();
    const a = Buffer.from(String(o?.public_token || ""));
    const b = Buffer.from(token);
    if (!o || a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: "not_found" }, 404);

    if (o.status === "pending_payment" && o.xendit_session_id) {
      const last = lastCheck.get(number) || 0;
      if (Date.now() - last > 10_000) {
        lastCheck.set(number, Date.now());
        try {
          await confirmPaymentFromXendit(o.xendit_session_id, "status-page");
          o = await load();
        } catch (e) {
          console.error("[status] cek Xendit gagal", (e as Error).message);
        }
      }
    }
    const [items] = await pool.query<RowDataPacket[]>(
      "SELECT name, unit_price, quantity FROM order_items WHERE order_id = ?",
      [o.id]
    );
    return json({
      order_number: o.order_number,
      status: o.status,
      subtotal: o.subtotal,
      shipping_cost: o.shipping_cost,
      total: o.total,
      courier: `${o.courier_name} ${o.courier_service_name}`,
      shipping_etd: o.shipping_etd,
      recipient_name: o.recipient_name,
      area_name: o.area_name,
      payment_link_url: o.status === "pending_payment" ? o.payment_link_url : null,
      payment_expires_at: o.payment_expires_at,
      paid_at: o.paid_at,
      tracking_number: o.tracking_number,
      created_at: o.created_at,
      items,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
