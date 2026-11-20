import type { NextRequest } from "next/server";
import { z } from "zod";
import { json, withAdmin } from "@/lib/shop/http";
import { getSettings, saveSettings } from "@/lib/shop/settings";
import { refreshPublicShipping } from "@/lib/shop/public-shipping";
import { addDays, isCutoff, isYmd } from "@/lib/shop/shipping-schedule";

const MAX_SPAN_DAYS = 60;

const holiday = z
  .object({
    start: z.string().refine(isYmd, "Tanggal mulai libur tidak valid"),
    end: z.string().refine(isYmd, "Tanggal selesai libur tidak valid"),
    label: z.string().trim().max(60, "Keterangan libur maks. 60 karakter").default(""),
  })
  .refine((h) => h.end >= h.start, "Tanggal selesai libur tidak boleh sebelum tanggal mulai")
  .refine((h) => h.end <= addDays(h.start, MAX_SPAN_DAYS - 1), `Satu periode libur maksimal ${MAX_SPAN_DAYS} hari`);

const body = z.object({
  ship_cutoff: z.string().refine(isCutoff, "Jam batas harus berformat JJ:MM, mis. 13:00"),
  ship_holidays: z.array(holiday).max(50, "Maksimal 50 periode libur"),
});

/** Ubah jam batas pengiriman & daftar libur pengiriman. */
export async function PUT(request: NextRequest) {
  return withAdmin(request, async (admin) => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || "Data tidak valid" }, 400);
    const holidays = [...parsed.data.ship_holidays].sort((a, b) => a.start.localeCompare(b.start));
    await saveSettings({ ship_cutoff: parsed.data.ship_cutoff, ship_holidays: JSON.stringify(holidays) });
    refreshPublicShipping(); // FAQ di landing page statis langsung memakai jam batas baru
    console.log(`[settings] jadwal pengiriman diubah oleh ${admin.email}: batas ${parsed.data.ship_cutoff}, ${holidays.length} libur`);
    return json({ settings: await getSettings() });
  });
}
