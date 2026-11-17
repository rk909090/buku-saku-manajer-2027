import type { NextRequest } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { json, withAdmin } from "@/lib/shop/http";
import { refreshLandingPromo } from "@/lib/shop/landing-promo";
import { listProducts } from "@/lib/shop/orders";

const body = z.object({
  name: z.string().trim().min(2).max(160),
  price: z.number().int().min(1000).max(100_000_000),
  weight_g: z.number().int().min(1).max(100_000).nullable(),
  length_cm: z.number().min(0.1).max(500).nullable(),
  width_cm: z.number().min(0.1).max(500).nullable(),
  height_cm: z.number().min(0.1).max(500).nullable(),
  stock: z.number().int().min(0).max(1_000_000).nullable(),
  active: z.boolean(),
});

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/products/[id]">) {
  return withAdmin(request, async () => {
    const id = Number((await ctx.params).id);
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!Number.isInteger(id) || id < 1) return json({ error: "not_found" }, 404);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      return json({ error: `Data produk tidak valid${i ? ` (${i.path.join(".")}: ${i.message})` : ""}` }, 400);
    }
    const p = parsed.data;
    await getPool().query(
      `UPDATE products SET name = ?, price = ?, weight_g = ?, length_cm = ?, width_cm = ?, height_cm = ?, stock = ?, active = ?
        WHERE id = ?`,
      [p.name, p.price, p.weight_g, p.length_cm, p.width_cm, p.height_cm, p.stock, p.active ? 1 : 0, id]
    );
    refreshLandingPromo();
    return json({ products: await listProducts(false) });
  });
}
