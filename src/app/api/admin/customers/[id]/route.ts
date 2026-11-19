import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { deleteCustomer } from "@/lib/shop/cleanup";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/admin/customers/[id]">) {
  return withAdmin(request, async () => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "not_found" }, 404);
    const pool = getPool();
    const [c] = await pool.query<RowDataPacket[]>("SELECT id, name, email, phone, created_at FROM customers WHERE id = ?", [id]);
    if (!c[0]) return json({ error: "not_found" }, 404);
    const [orders] = await pool.query<RowDataPacket[]>(
      `SELECT id, order_number, status, total, courier_name, courier_service_name, recipient_name, area_name, created_at, paid_at
         FROM orders WHERE customer_id = ? ORDER BY id DESC`,
      [id]
    );
    return json({ customer: c[0], orders });
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
