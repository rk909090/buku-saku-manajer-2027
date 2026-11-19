import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, json, rateLimited, withAdmin } from "@/lib/shop/http";
import { getSettings } from "@/lib/shop/settings";
import { SITE_ORIGIN } from "@/lib/shop/env";
import { createPaymentSession, XenditError } from "@/lib/shop/xendit";
import { VA_CODES } from "@/lib/shop/payment-channels";

const body = z.object({ payment_channels: z.array(z.string()).max(VA_CODES.length) });

/**
 * Uji pilihan kanal langsung ke Xendit: membuat sesi pembayaran UJI Rp10.000 (kedaluwarsa 30 menit, bukan
 * pesanan) dengan `allowed_payment_channels` yang dipilih. Berhasil → admin bisa membuka halaman bayar persis
 * seperti yang dilihat pembeli. Gagal → pesan Xendit (mis. kanal yang belum aktif) ditampilkan apa adanya.
 */
export async function POST(request: NextRequest) {
  return withAdmin(request, async (admin) => {
    if (rateLimited(`pay-test:${clientIp(request)}`, 6, 10 * 60_000)) return json({ error: "Terlalu sering. Coba lagi beberapa menit lagi." }, 429);
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Data tidak valid" }, 400);
    const channels = VA_CODES.filter((c) => parsed.data.payment_channels.includes(c));
    const settings = await getSettings();
    const ref = `UJI-${randomBytes(4).toString("hex").toUpperCase()}`;
    try {
      const s = await createPaymentSession({
        referenceId: ref,
        amount: 10000,
        description: "UJI metode pembayaran dari dashboard — jangan dibayar",
        customer: { referenceId: `admin${admin.id}`, email: admin.email, mobileNumber: `+${settings.whatsapp_number}`, givenNames: "Uji Admin" },
        items: [{ referenceId: "uji", type: "FEE", name: "Uji metode pembayaran (jangan dibayar)", category: "Uji", netUnitAmount: 10000, quantity: 1 }],
        successReturnUrl: `${SITE_ORIGIN}/admin/settings`,
        cancelReturnUrl: `${SITE_ORIGIN}/admin/settings`,
        expiresAt: new Date(Date.now() + 30 * 60_000),
        allowedChannels: channels,
      });
      console.log(`[settings] uji kanal pembayaran oleh ${admin.email}: ${ref} (${channels.join(",") || "semua"})`);
      return json({ ok: true, url: s.payment_link_url, reference: ref, channels });
    } catch (e) {
      if (e instanceof XenditError) return json({ error: `Xendit menolak: ${e.message}${e.code ? ` (${e.code})` : ""}` }, 422);
      throw e;
    }
  });
}
