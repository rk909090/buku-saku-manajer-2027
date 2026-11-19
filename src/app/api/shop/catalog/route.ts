import { connection } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { errorResponse, json } from "@/lib/shop/http";
import { listProducts, shippingReady } from "@/lib/shop/orders";
import { getSettings } from "@/lib/shop/settings";
import { integrationStatus } from "@/lib/shop/env";
import { activeDiscounts, bestDiscount, hasRedeemableCoupon } from "@/lib/shop/promo";
import { channelLabel, parseChannels } from "@/lib/shop/payment-channels";

/** Katalog publik: harga & ketersediaan dari DB (bukan dari kode), plus status kesiapan checkout. */
export async function GET() {
  await connection(); // selalu dinamis: data dari DB, jangan di-prerender saat build
  if (!isDbConfigured()) return json({ error: "Toko belum siap" }, 503);
  try {
    const [products, settings, discounts, couponsEnabled] = await Promise.all([
      listProducts(true),
      getSettings(),
      activeDiscounts(),
      hasRedeemableCoupon(),
    ]);
    const integ = integrationStatus();
    const ship = shippingReady(products, settings);
    return json({
      products: products.map((p) => {
        const best = bestDiscount(p.price, p.id, discounts);
        return {
          slug: p.slug,
          name: p.name,
          price: p.price - (best?.amount || 0),
          original_price: best ? p.price : null,
          discount_name: best?.discount.name || null,
          discount_ends_at: best?.discount.ends_at || null,
          image_url: p.image_url,
          available: p.stock == null || p.stock > 0,
          stock: p.stock,
        };
      }),
      maxQty: settings.max_qty_per_item,
      minOrderTotal: settings.min_order_total,
      whatsapp: settings.whatsapp_number,
      // Nama bank VA yang ditampilkan Xendit (kosong = semua metode yang aktif).
      paymentBanks: parseChannels(settings.payment_channels).map(channelLabel),
      couponsEnabled,
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
