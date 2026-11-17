import type { NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { addEvent, confirmPaymentFromXendit } from "@/lib/shop/orders";
import { ORDER_STATUS } from "@/lib/format";

/** Transisi status yang boleh dilakukan admin. "paid" hanya dari Xendit (webhook / cek ulang). */
const TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["cancelled"],
  paid: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  expired: [],
  cancelled: [],
};

async function load(id: number) {
  const pool = getPool();
  const [orders] = await pool.query<RowDataPacket[]>(
    `SELECT o.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
       FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ? LIMIT 1`,
    [id]
  );
  if (!orders[0]) return null;
  const { public_token: _t, ...order } = orders[0];
  void _t;
  const [items] = await pool.query<RowDataPacket[]>("SELECT * FROM order_items WHERE order_id = ?", [id]);
  const [events] = await pool.query<RowDataPacket[]>(
    "SELECT type, message, actor, created_at FROM order_events WHERE order_id = ? ORDER BY id DESC",
    [id]
  );
  return { order, items, events, allowedNext: TRANSITIONS[order.status as string] || [] };
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/admin/orders/[id]">) {
  return withAdmin(request, async () => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "not_found" }, 404);
    const data = await load(id);
    return data ? json(data) : json({ error: "not_found" }, 404);
  });
}

const patch = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    status: z.enum(["processing", "shipped", "completed", "cancelled"]),
    tracking_number: z.string().trim().max(64).optional(),
    note: z.string().trim().max(400).optional(),
  }),
  z.object({ action: z.literal("tracking"), tracking_number: z.string().trim().min(3).max(64) }),
  z.object({ action: z.literal("note"), note: z.string().trim().min(1).max(400) }),
  z.object({ action: z.literal("recheck_payment") }),
]);

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/orders/[id]">) {
  return withAdmin(request, async (admin) => {
    const id = Number((await ctx.params).id);
    const parsed = patch.safeParse(await request.json().catch(() => null));
    if (!Number.isInteger(id) || id < 1) return json({ error: "not_found" }, 404);
    if (!parsed.success) return json({ error: "Data tidak valid" }, 400);
    const pool = getPool();
    const current = await load(id);
    if (!current) return json({ error: "not_found" }, 404);
    const o = current.order as Record<string, unknown>;
    const b = parsed.data;

    if (b.action === "note") {
      await addEvent(pool, id, "note", b.note, admin.email);
    } else if (b.action === "tracking") {
      await pool.query("UPDATE orders SET tracking_number = ? WHERE id = ?", [b.tracking_number, id]);
      await addEvent(pool, id, "tracking", `No. resi: ${b.tracking_number}`, admin.email);
    } else if (b.action === "recheck_payment") {
      if (!o.xendit_session_id) return json({ error: "Pesanan ini tidak punya sesi Xendit" }, 400);
      const r = await confirmPaymentFromXendit(String(o.xendit_session_id), `admin:${admin.email}`);
      if (!r.ok) return json({ error: `Tidak bisa dikonfirmasi: ${r.reason}` }, 409);
    } else {
      const from = String(o.status);
      if (!(TRANSITIONS[from] || []).includes(b.status))
        return json({ error: `Status tidak bisa diubah dari "${ORDER_STATUS[from]?.label || from}" ke "${ORDER_STATUS[b.status].label}"` }, 409);
      const tracking = b.tracking_number || (o.tracking_number as string | null);
      if (b.status === "shipped" && !tracking) return json({ error: "Isi nomor resi sebelum menandai dikirim" }, 400);

      const [res] = await pool.query<ResultSetHeader>(
        `UPDATE orders SET status = ?, tracking_number = ?, shipped_at = IF(? = 'shipped', CURRENT_TIMESTAMP(3), shipped_at)
          WHERE id = ? AND status = ?`,
        [b.status, tracking || null, b.status, id, from]
      );
      if (res.affectedRows !== 1) return json({ error: "Pesanan baru saja berubah, muat ulang halaman" }, 409);
      // Pembatalan pesanan yang sudah dibayar: kembalikan stok. Refund dana dilakukan manual di Xendit.
      if (b.status === "cancelled" && ["paid", "processing"].includes(from)) {
        await pool.query(
          `UPDATE products p JOIN order_items oi ON oi.product_id = p.id
              SET p.stock = p.stock + oi.quantity WHERE oi.order_id = ? AND p.stock IS NOT NULL`,
          [id]
        );
      }
      await addEvent(
        pool,
        id,
        "status",
        `Status: ${ORDER_STATUS[from]?.label || from} → ${ORDER_STATUS[b.status].label}${b.status === "shipped" ? ` (resi ${tracking})` : ""}${b.note ? ` — ${b.note}` : ""}`,
        admin.email
      );
    }
    return json(await load(id));
  });
}
