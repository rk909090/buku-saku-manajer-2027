import { connection } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { errorResponse, json } from "@/lib/shop/http";
import { listProducts, shippingReady } from "@/lib/shop/orders";
import { getSettings } from "@/lib/shop/settings";
import { integrationStatus } from "@/lib/shop/env";

/** Katalog publik: harga & ketersediaan dari DB (bukan dari kode), plus status kesiapan checkout. */
export async function GET() {
  await connection(); // selalu dinamis: data dari DB, jangan di-prerender saat build
  if (!isDbConfigured()) return json({ error: "Toko belum siap" }, 503);
  try {
    const [products, settings] = await Promise.all([listProducts(true), getSettings()]);
    const integ = integrationStatus();
    const ship = shippingReady(products, settings);
    return json({
      products: products.map((p) => ({
        slug: p.slug,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        available: p.stock == null || p.stock > 0,
        stock: p.stock,
      })),
      maxQty: settings.max_qty_per_item,
      checkout: {
        ready: ship.ok && integ.biteship !== "missing" && integ.xendit !== "missing" && integ.xenditWebhook !== "missing",
        reason: !ship.ok
          ? ship.reason
          : integ.biteship === "missing"
            ? "Perhitungan ongkir belum dikonfigurasi"
            : integ.xendit === "missing"
              ? "Pembayaran online belum dikonfigurasi"
              : integ.xenditWebhook === "missing"
                ? "Webhook Xendit belum dikonfigurasi"
                : "",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
