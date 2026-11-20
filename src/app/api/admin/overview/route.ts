import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { integrationStatus } from "@/lib/shop/env";
import { getSettings } from "@/lib/shop/settings";
import { listProducts, shippingReady } from "@/lib/shop/orders";

const PAID = "('paid','processing','shipped','completed')";

/** Ringkasan dashboard: pendapatan, jumlah pesanan per status, tren 14 hari, pesanan terbaru. */
export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const pool = getPool();
    const [[totals]] = (await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ${PAID} THEN total END),0) AS revenue_all,
         COALESCE(SUM(CASE WHEN status IN ${PAID} AND paid_at >= CURRENT_DATE - INTERVAL 30 DAY THEN total END),0) AS revenue_30d,
         COALESCE(SUM(CASE WHEN status IN ${PAID} AND paid_at >= CURRENT_DATE - INTERVAL 7 DAY THEN total END),0) AS revenue_7d,
         SUM(status IN ${PAID}) AS paid_orders,
         SUM(status IN ${PAID} AND paid_at >= CURRENT_DATE - INTERVAL 30 DAY) AS paid_orders_30d,
         COUNT(*) AS all_orders,
         SUM(status = 'paid') AS to_process
       FROM orders`
    )) as unknown as [[Record<string, number | string>]];
    const [byStatus] = await pool.query<RowDataPacket[]>("SELECT status, COUNT(*) AS n FROM orders GROUP BY status");
    const [daily] = await pool.query<RowDataPacket[]>(
      // Tanggal WIB sebagai teks "YYYY-MM-DD" agar tidak bergeser oleh zona waktu proses Node saat diubah ke Date.
      `SELECT DATE_FORMAT(CONVERT_TZ(paid_at,'+00:00','+07:00'),'%Y-%m-%d') AS day, COUNT(*) AS orders, SUM(total) AS revenue
         FROM orders WHERE status IN ${PAID} AND paid_at >= CURRENT_DATE - INTERVAL 14 DAY
        GROUP BY day ORDER BY day`
    );
    const [[cust]] = (await pool.query("SELECT COUNT(*) AS n FROM customers")) as unknown as [[{ n: number }]];
    const [recent] = await pool.query<RowDataPacket[]>(
      `SELECT o.id, o.order_number, o.status, o.total, o.created_at, c.name AS customer_name
         FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.id DESC LIMIT 8`
    );
    const [settings, products] = await Promise.all([getSettings(), listProducts(false)]);
    const ship = shippingReady(products.filter((p) => p.active), settings);
    return json({
      totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Number(v || 0)])),
      customers: Number(cust.n),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.n)])),
      daily: daily.map((d) => ({ day: d.day, orders: Number(d.orders), revenue: Number(d.revenue) })),
      recent,
      setup: {
        integrations: integrationStatus(),
        shipping: ship,
      },
    });
  });
}
