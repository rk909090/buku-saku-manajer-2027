import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { getSettings, shipConfigOf } from "@/lib/shop/settings";
import { shipScheduleFor } from "@/lib/shop/shipping-schedule";

const STATUSES = ["pending_payment", "paid", "processing", "shipped", "completed", "expired", "cancelled"];
const PAGE_SIZE = 20;

/** Daftar pesanan: filter status, cari (no. pesanan / nama / email / WA / resi), paginasi, atau ekspor CSV. */
export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const sp = request.nextUrl.searchParams;
    const status = sp.get("status") || "";
    const q = (sp.get("q") || "").trim().slice(0, 100);
    const page = Math.max(1, Number(sp.get("page") || 1) || 1);
    const format = sp.get("format");

    const where: string[] = [];
    const args: unknown[] = [];
    if (STATUSES.includes(status)) {
      where.push("o.status = ?");
      args.push(status);
    }
    if (q) {
      where.push("(o.order_number LIKE ? OR c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR o.tracking_number LIKE ?)");
      const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
      args.push(like, like, like, like, like);
    }
    const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const pool = getPool();

    if (format === "csv") {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT o.order_number, o.created_at, o.status, c.name, c.email, c.phone, o.recipient_name, o.recipient_phone,
                o.address, o.area_name, o.postal_code, o.courier_name, o.courier_service_name, o.tracking_number,
                o.subtotal, o.discount_total, o.coupon_code, o.coupon_discount, o.shipping_cost, o.shipping_discount, o.total, o.paid_at,
                (SELECT GROUP_CONCAT(CONCAT(oi.name,' x',oi.quantity) SEPARATOR '; ') FROM order_items oi WHERE oi.order_id = o.id) AS items
           FROM orders o JOIN customers c ON c.id = o.customer_id ${w} ORDER BY o.id DESC LIMIT 5000`,
        args
      );
      // Jadwal kirim (WIB) untuk pesanan lunas — sama dengan label di dashboard.
      const cfg = shipConfigOf(await getSettings());
      for (const r of rows) r.ship_date = r.paid_at && ["paid", "processing", "shipped", "completed"].includes(r.status) ? shipScheduleFor(r.paid_at, cfg).date : "";
      const cols = Object.keys(rows[0] || { order_number: "" });
      const esc = (v: unknown) => {
        const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
        // Cegah CSV/formula injection di Excel/Sheets.
        const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
      return new Response("﻿" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="pesanan-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const [[count]] = (await pool.query(
      `SELECT COUNT(*) AS n FROM orders o JOIN customers c ON c.id = o.customer_id ${w}`,
      args
    )) as unknown as [[{ n: number }]];
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.id, o.order_number, o.status, o.total, o.courier_name, o.courier_service_name, o.tracking_number,
              o.created_at, o.paid_at, c.id AS customer_id, c.name AS customer_name, c.email AS customer_email,
              (SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id) AS qty
         FROM orders o JOIN customers c ON c.id = o.customer_id ${w}
        ORDER BY o.id DESC LIMIT ? OFFSET ?`,
      [...args, PAGE_SIZE, (page - 1) * PAGE_SIZE]
    );
    // Jam batas & libur untuk menghitung jadwal kirim tiap pesanan di browser (label relatif "hari ini/besok").
    return json({ orders: rows, total: Number(count.n), page, pageSize: PAGE_SIZE, shipConfig: shipConfigOf(await getSettings()) });
  });
}
