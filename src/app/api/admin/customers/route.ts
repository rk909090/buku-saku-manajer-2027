import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";

const PAGE_SIZE = 20;
const PAID = "('paid','processing','shipped','completed')";

/** Daftar pelanggan + jumlah pesanan & total belanja (hanya pesanan yang sudah dibayar). */
export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const sp = request.nextUrl.searchParams;
    const q = (sp.get("q") || "").trim().slice(0, 100);
    const page = Math.max(1, Number(sp.get("page") || 1) || 1);
    const args: unknown[] = [];
    let w = "";
    if (q) {
      const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
      w = "WHERE c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?";
      args.push(like, like, like);
    }
    const pool = getPool();
    const [[count]] = (await pool.query(`SELECT COUNT(*) AS n FROM customers c ${w}`, args)) as unknown as [[{ n: number }]];
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.name, c.email, c.phone, c.created_at,
              COUNT(o.id) AS orders,
              COALESCE(SUM(CASE WHEN o.status IN ${PAID} THEN 1 END),0) AS paid_orders,
              COALESCE(SUM(CASE WHEN o.status IN ${PAID} THEN o.total END),0) AS total_spent,
              MAX(o.created_at) AS last_order_at
         FROM customers c LEFT JOIN orders o ON o.customer_id = c.id ${w}
        GROUP BY c.id ORDER BY last_order_at DESC, c.id DESC LIMIT ? OFFSET ?`,
      [...args, PAGE_SIZE, (page - 1) * PAGE_SIZE]
    );
    return json({
      customers: rows.map((r) => ({ ...r, orders: Number(r.orders), paid_orders: Number(r.paid_orders), total_spent: Number(r.total_spent) })),
      total: Number(count.n),
      page,
      pageSize: PAGE_SIZE,
    });
  });
}
