import type { NextRequest } from "next/server";
import { json, withAdmin } from "@/lib/shop/http";
import { listProducts } from "@/lib/shop/orders";
import { listPromos } from "@/lib/shop/promo";

/** Daftar diskon & kupon (dengan status dan pemakaian) + produk untuk pilihan target diskon. */
export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const [promos, products] = await Promise.all([listPromos(), listProducts(false)]);
    return json({ ...promos, products: products.map((p) => ({ id: p.id, name: p.name, price: p.price })) });
  });
}
