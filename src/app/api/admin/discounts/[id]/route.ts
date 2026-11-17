import type { NextRequest } from "next/server";
import type { ResultSetHeader } from "mysql2/promise";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { listPromos } from "@/lib/shop/promo";
import { discountBody, firstIssue } from "@/lib/shop/promo-schemas";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/discounts/[id]">) {
  return withAdmin(request, async () => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "not_found" }, 404);
    const parsed = discountBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);
    const d = parsed.data;
    const [r] = await getPool().query<ResultSetHeader>(
      `UPDATE discounts SET name = ?, product_id = ?, type = ?, value = ?, starts_at = ?, ends_at = ?, active = ? WHERE id = ?`,
      [d.name, d.product_id, d.type, d.value, d.starts_at ? new Date(d.starts_at) : null, d.ends_at ? new Date(d.ends_at) : null, d.active ? 1 : 0, id]
    );
    if (!r.affectedRows) return json({ error: "Diskon tidak ditemukan" }, 404);
    return json(await listPromos());
  });
}

/** Hapus diskon. Pesanan lama tidak terpengaruh (harga & nama diskon tersimpan di item pesanan). */
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/admin/discounts/[id]">) {
  return withAdmin(request, async () => {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id < 1) return json({ error: "not_found" }, 404);
    await getPool().query("DELETE FROM discounts WHERE id = ?", [id]);
    return json(await listPromos());
  });
}
