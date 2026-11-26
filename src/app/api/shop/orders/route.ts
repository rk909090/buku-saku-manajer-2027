import type { NextRequest } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { AB_COOKIE, AB_EXPERIMENT, AB_VISITOR_COOKIE, isAbVariant } from "@/lib/ab-config";
import { clientIp, errorResponse, json, rateLimited, sameOrigin } from "@/lib/shop/http";
import { createOrder } from "@/lib/shop/orders";
import { queueAdminNewOrderEmail, queueCustomerEmail } from "@/lib/email/notify";
import { orderBody } from "@/lib/shop/schemas";
import { classifyChannel, sanitizeTouch } from "@/lib/attribution";

/**
 * Atribusi untuk disimpan di pesanan: touch terakhir non-langsung (bila tidak ada → touch pertama),
 * kanal hasil klasifikasi server, dan JSON {first,last} untuk detail. Data dari browser tidak dipercaya
 * begitu saja — semua dirapikan & dibatasi panjangnya oleh sanitizeTouch.
 */
function orderAttribution(a: { sessionId?: string | null; first?: unknown; last?: unknown } | null | undefined) {
  const first = sanitizeTouch(a?.first);
  const last = sanitizeTouch(a?.last);
  const t = last ?? first;
  return {
    sessionId: a?.sessionId && UUID_RE.test(a.sessionId) ? a.sessionId.toLowerCase() : null,
    channel: classifyChannel(t),
    touch: t,
    json: first || last ? JSON.stringify({ first, last }).slice(0, 2000) : null,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Buat pesanan + sesi pembayaran Xendit, lalu kembalikan URL halaman bayar. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (!isDbConfigured()) return json({ error: "Toko belum siap" }, 503);
  if (rateLimited(`orders:${clientIp(request)}`, 8, 10 * 60_000))
    return json({ error: "Terlalu banyak percobaan pesanan. Coba lagi beberapa menit lagi." }, 429);
  try {
    const parsed = orderBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return json({ error: first?.message && !first.message.startsWith("Invalid") ? first.message : "Data pesanan tidak valid" }, 400);
    }
    // Atribusi A/B: varian headline & ID pengunjung dari cookie (bukan dari body).
    const [exp, v] = (request.cookies.get(AB_COOKIE)?.value || "").split(".");
    const vid = request.cookies.get(AB_VISITOR_COOKIE)?.value || "";
    const { orderId, ...result } = await createOrder({
      lines: parsed.data.lines,
      customer: parsed.data.customer,
      shipping: parsed.data.shipping,
      courier: parsed.data.courier,
      couponCode: parsed.data.couponCode || null,
      abVariant: exp === AB_EXPERIMENT && isAbVariant(v) ? v : null,
      visitorId: UUID_RE.test(vid) ? vid : null,
      attribution: orderAttribution(parsed.data.attribution),
    });
    // Email konfirmasi ke pembeli (+ admin bila diaktifkan) — dikirim setelah respons ini selesai.
    queueCustomerEmail(orderId, "created");
    queueAdminNewOrderEmail(orderId, false);
    return json(result, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
