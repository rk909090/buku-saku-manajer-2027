import type { NextRequest } from "next/server";
import { z } from "zod";
import { json, withAdmin } from "@/lib/shop/http";
import { getSettings, saveSettings } from "@/lib/shop/settings";
import { refreshPublicContact } from "@/lib/shop/public-contact";
import { MAX_WA_GREETING, normalizeGreeting, normalizeWhatsapp } from "@/lib/whatsapp";

const body = z.object({
  whatsapp_number: z.string().max(40),
  // Opsional agar klien lama (hanya nomor) tetap berfungsi; undefined = sapaan tidak diubah.
  whatsapp_greeting: z.string().max(2000).optional(),
});

/** Ubah nomor WhatsApp toko & teks sapaan (landing page, checkout, dan email). */
export async function PUT(request: NextRequest) {
  return withAdmin(request, async (admin) => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Data tidak valid" }, 400);
    const n = normalizeWhatsapp(parsed.data.whatsapp_number);
    if (!n) return json({ error: "Nomor WhatsApp tidak valid. Contoh: 087840848566 atau 6287840848566" }, 400);
    const greeting = parsed.data.whatsapp_greeting === undefined ? undefined : normalizeGreeting(parsed.data.whatsapp_greeting);
    if (greeting !== undefined && greeting.length > MAX_WA_GREETING) {
      return json({ error: `Teks sapaan maksimal ${MAX_WA_GREETING} karakter (sekarang ${greeting.length}).` }, 400);
    }
    await saveSettings({ whatsapp_number: n, ...(greeting !== undefined ? { whatsapp_greeting: greeting } : {}) });
    refreshPublicContact(); // landing page statis langsung memakai nomor & sapaan baru
    console.log(`[settings] kontak WhatsApp diubah oleh ${admin.email}`);
    return json({ settings: await getSettings() });
  });
}
