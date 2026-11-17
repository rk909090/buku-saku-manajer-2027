import type { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { refreshLandingPromo } from "@/lib/shop/landing-promo";
import { listPromos } from "@/lib/shop/promo";
import { discountBody, firstIssue } from "@/lib/shop/promo-schemas";

export async function POST(request: NextRequest) {
  return withAdmin(request, async () => {
    const parsed = discountBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: firstIssue(parsed.error) }, 400);
    const d = parsed.data;
    await getPool().query(
      `INSERT INTO discounts (name, product_id, type, value, starts_at, ends_at, active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.name, d.product_id, d.type, d.value, d.starts_at ? new Date(d.starts_at) : null, d.ends_at ? new Date(d.ends_at) : null, d.active ? 1 : 0]
    );
    refreshLandingPromo();
    return json(await listPromos(), 201);
  });
}
