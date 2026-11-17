import type { NextRequest } from "next/server";
import { getPool, isDbConfigured } from "@/lib/db";
import { clientIp, errorResponse, json, rateLimited, sameOrigin } from "@/lib/shop/http";
import { priceCart } from "@/lib/shop/orders";
import { applyMinimumTotal, evaluateCoupon } from "@/lib/shop/promo";
import { couponBody } from "@/lib/shop/schemas";

/**
 * Pratinjau kupon di checkout. Nilai akhir tetap dihitung ulang saat pesanan dibuat
 * (createOrder), termasuk kuota yang dikunci di dalam transaksi.
 */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (!isDbConfigured()) return json({ error: "Toko belum siap" }, 503);
  // Batasi percobaan agar kode kupon tidak bisa ditebak beruntun.
  if (rateLimited(`coupon:${clientIp(request)}`, 15, 10 * 60_000))
    return json({ error: "Terlalu banyak percobaan kupon. Coba lagi beberapa menit lagi." }, 429);
  try {
    const parsed = couponBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || "Data tidak valid" }, 400);
    const { code, lines, shippingCost, email } = parsed.data;
    const { subtotal, settings } = await priceCart(lines);
    const q = await evaluateCoupon(getPool(), code, { subtotal, shippingCost, email: email || null });
    const m =
      shippingCost == null
        ? null
        : applyMinimumTotal({
            subtotal,
            couponDiscount: q.discount,
            shipping: shippingCost,
            shippingDiscount: q.shippingDiscount || 0,
            min: settings.min_order_total,
          });
    return json({
      code: q.coupon.code,
      label: q.label,
      description: q.coupon.description,
      type: q.coupon.type,
      discount: m ? m.couponDiscount : q.discount,
      shippingDiscount: m ? m.shippingDiscount : q.shippingDiscount,
      limitedByMinimum: m?.limited || false,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
