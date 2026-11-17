import type { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { listPromos } from "@/lib/shop/promo";
import { couponAdminBody, firstIssue } from "@/lib/shop/promo-schemas";

export async function POST(request: NextRequest) {
  return withAdmin(request, async () => {
    const parsed = couponAdminBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);
    const c = parsed.data;
    try {
      await getPool().query(
        `INSERT INTO coupons (code, description, type, value, max_discount, min_subtotal, starts_at, ends_at, usage_limit, per_customer_limit, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.code, c.description, c.type, c.type === "free_shipping" ? 0 : c.value, c.type === "fixed" ? null : c.max_discount, c.min_subtotal,
          c.starts_at ? new Date(c.starts_at) : null, c.ends_at ? new Date(c.ends_at) : null, c.usage_limit, c.per_customer_limit, c.active ? 1 : 0,
        ]
      );
    } catch (e) {
      if ((e as { code?: string }).code === "ER_DUP_ENTRY") return json({ error: `Kode ${c.code} sudah dipakai kupon lain` }, 409);
      throw e;
    }
    return json(await listPromos(), 201);
  });
}
