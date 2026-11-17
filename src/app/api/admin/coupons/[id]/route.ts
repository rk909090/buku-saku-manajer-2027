import type { NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { listPromos } from "@/lib/shop/promo";
import { couponAdminBody, firstIssue } from "@/lib/shop/promo-schemas";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/coupons/[id]">) {
  return withAdmin(request, async () => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "not_found" }, 404);
    const parsed = couponAdminBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);
    const c = parsed.data;
    try {
      const [r] = await getPool().query<ResultSetHeader>(
        `UPDATE coupons SET code = ?, description = ?, type = ?, value = ?, max_discount = ?, free_shipping = ?, min_subtotal = ?, starts_at = ?, ends_at = ?,
                usage_limit = ?, per_customer_limit = ?, active = ? WHERE id = ?`,
        [
          c.code, c.description, c.type, c.type === "free_shipping" ? 0 : c.value, c.type === "fixed" ? null : c.max_discount, c.type !== "free_shipping" && c.free_shipping ? 1 : 0, c.min_subtotal,
          c.starts_at ? new Date(c.starts_at) : null, c.ends_at ? new Date(c.ends_at) : null, c.usage_limit, c.per_customer_limit, c.active ? 1 : 0, id,
        ]
      );
      if (!r.affectedRows) return json({ error: "Kupon tidak ditemukan" }, 404);
    } catch (e) {
      if ((e as { code?: string }).code === "ER_DUP_ENTRY") return json({ error: `Kode ${c.code} sudah dipakai kupon lain` }, 409);
      throw e;
    }
    return json(await listPromos());
  });
}

/** Hapus kupon — hanya bila belum pernah dipakai pesanan; jika sudah, nonaktifkan saja agar riwayat tetap utuh. */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/coupons/[id]">) {
  return withAdmin(request, async () => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "not_found" }, 404);
    const pool = getPool();
    const [u] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM orders WHERE coupon_id = ?", [id]);
    if (Number(u[0].n) > 0) return json({ error: "Kupon sudah dipakai pesanan — nonaktifkan saja agar riwayat tetap utuh" }, 409);
    await pool.query("DELETE FROM coupons WHERE id = ?", [id]);
    return json(await listPromos());
  });
}
