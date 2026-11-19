import "server-only";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from "@/lib/db";

/**
 * Penghapusan permanen data uji. HANYA pesanan berstatus kedaluwarsa/dibatalkan yang boleh dihapus — pesanan yang
 * pernah dibayar (paid/processing/shipped/completed) adalah catatan keuangan dan tidak bisa dihapus dari dashboard.
 */
export const DELETABLE_STATUSES = ["expired", "cancelled"] as const;
export const isDeletable = (status: string) => (DELETABLE_STATUSES as readonly string[]).includes(status);

async function deleteOrderRows(conn: PoolConnection, ids: number[]) {
  if (ids.length === 0) return 0;
  await conn.query("DELETE FROM order_items WHERE order_id IN (?)", [ids]);
  await conn.query("DELETE FROM order_events WHERE order_id IN (?)", [ids]);
  const [r] = await conn.query<ResultSetHeader>("DELETE FROM orders WHERE id IN (?) AND status IN ('expired','cancelled')", [ids]);
  return r.affectedRows;
}

async function inTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function deleteOrder(id: number): Promise<{ ok: true; orderNumber: string } | { ok: false; error: string; status: number }> {
  return inTransaction(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>("SELECT id, order_number, status FROM orders WHERE id = ? FOR UPDATE", [id]);
    const o = rows[0];
    if (!o) return { ok: false, error: "Pesanan tidak ditemukan", status: 404 };
    if (!isDeletable(o.status)) return { ok: false, error: "Hanya pesanan kedaluwarsa atau dibatalkan yang bisa dihapus", status: 409 };
    await deleteOrderRows(conn, [id]);
    return { ok: true, orderNumber: String(o.order_number) };
  });
}

/** Hapus pelanggan beserta SEMUA pesanannya — hanya bila semua pesanannya kedaluwarsa/dibatalkan. */
export async function deleteCustomer(id: number): Promise<{ ok: true; email: string; orders: number } | { ok: false; error: string; status: number }> {
  return inTransaction(async (conn) => {
    const [c] = await conn.query<RowDataPacket[]>("SELECT id, email FROM customers WHERE id = ? FOR UPDATE", [id]);
    if (!c[0]) return { ok: false, error: "Pelanggan tidak ditemukan", status: 404 };
    const [orders] = await conn.query<RowDataPacket[]>("SELECT id, status FROM orders WHERE customer_id = ? FOR UPDATE", [id]);
    const blocked = orders.filter((o) => !isDeletable(o.status));
    if (blocked.length) return { ok: false, error: `Pelanggan punya ${blocked.length} pesanan yang pernah dibayar/aktif — tidak bisa dihapus`, status: 409 };
    const n = await deleteOrderRows(conn, orders.map((o) => Number(o.id)));
    await conn.query("DELETE FROM customers WHERE id = ?", [id]);
    return { ok: true, email: String(c[0].email), orders: n };
  });
}
