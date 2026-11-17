import type { NextRequest } from "next/server";
import { z } from "zod";
import { json, withAdmin } from "@/lib/shop/http";
import { getSettings, saveSettings } from "@/lib/shop/settings";
import { refreshPublicContact } from "@/lib/shop/public-contact";
import { normalizeWhatsapp } from "@/lib/whatsapp";

const body = z.object({ whatsapp_number: z.string().max(40) });

/** Ubah nomor WhatsApp toko (landing page, checkout, dan email). */
export async function PUT(request: NextRequest) {
  return withAdmin(request, async (admin) => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Data tidak valid" }, 400);
    const n = normalizeWhatsapp(parsed.data.whatsapp_number);
    if (!n) return json({ error: "Nomor WhatsApp tidak valid. Contoh: 087840848566 atau 6287840848566" }, 400);
    await saveSettings({ whatsapp_number: n });
    refreshPublicContact(); // landing page statis langsung memakai nomor baru
    console.log(`[settings] nomor WhatsApp diubah oleh ${admin.email}`);
    return json({ settings: await getSettings() });
  });
}
