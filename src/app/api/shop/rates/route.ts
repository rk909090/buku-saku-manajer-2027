import type { NextRequest } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { clientIp, errorResponse, json, rateLimited, sameOrigin } from "@/lib/shop/http";
import { ratesForCart } from "@/lib/shop/orders";
import { ratesBody } from "@/lib/shop/schemas";

/** Ongkir untuk isi keranjang ke area tujuan. Berat & harga diambil dari DB, bukan dari browser. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (!isDbConfigured()) return json({ error: "Toko belum siap" }, 503);
  if (rateLimited(`rates:${clientIp(request)}`, 30, 60_000)) return json({ error: "Terlalu banyak permintaan" }, 429);
  try {
    const parsed = ratesBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Data tidak valid" }, 400);
    const options = await ratesForCart(parsed.data.lines, parsed.data.areaId);
    return json({ options });
  } catch (e) {
    return errorResponse(e);
  }
}
