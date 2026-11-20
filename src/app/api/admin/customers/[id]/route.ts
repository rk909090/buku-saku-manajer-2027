import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { deleteCustomer } from "@/lib/shop/cleanup";
import { getSettings, shipConfigOf } from "@/lib/shop/settings";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/admin/customers/[id]">) {
  return withAdmin(request, async () => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "not_found" }, 404);
    const pool = getPool();
    const [c] = await pool.query<RowDataPacket[]>("SELECT id, name, email, phone, created_at FROM customers WHERE id = ?", [id]);
    if (!c[0]) return json({ error: "not_found" }, 404);
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT o.id, o.order_number, o.status, o.total, o.courier_name, o.courier_service_name, o.recipient_name, o.area_name,
              o.tracking_number, o.created_at, o.paid_at,
              (SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi WHERE oi.order_id = o.id) AS qty
         FROM orders o WHERE o.customer_id = ? ORDER BY o.id DESC`,
      [id]
    );
    // Alamat pengiriman yang pernah dipakai (unik), terbaru dulu.
    const [addresses] = await pool.query<RowDataPacket[]>(
      `SELECT recipient_name, recipient_phone, address, area_name, postal_code,
              COUNT(*) AS orders, MAX(created_at) AS last_used
         FROM orders WHERE customer_id = ?
        GROUP BY recipient_name, recipient_phone, address, area_name, postal_code
        ORDER BY last_used DESC
        LIMIT 20`,
      [id]
    );
    return json({
      customer: c[0],
      orders: orders.map((o) => ({ ...o, qty: Number(o.qty), total: Number(o.total) })),
      addresses: addresses.map((a) => ({ ...a, orders: Number(a.orders) })),
      shipConfig: shipConfigOf(await getSettings()),
    });
  });
}

/** Hapus permanen pelanggan uji beserta pesanannya (hanya bila semua pesanan kedaluwarsa/dibatalkan). */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/customers/[id]">) {
  return withAdmin(request, async (admin) => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "not_found" }, 404);
    const r = await deleteCustomer(id);
    if (!r.ok) return json({ error: r.error }, r.status);
    console.log(`[admin] pelanggan #${id} (${r.orders} pesanan) dihapus oleh ${admin.email}`);
    return json({ ok: true, orders: r.orders });
  });
}
