import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";

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
