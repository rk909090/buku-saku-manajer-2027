import type { NextRequest } from "next/server";
import { z } from "zod";
import { json, withAdmin } from "@/lib/shop/http";
import { getSettings, saveSettings } from "@/lib/shop/settings";
import { VA_CODES } from "@/lib/shop/payment-channels";

const body = z.object({ payment_channels: z.array(z.string()).max(VA_CODES.length) });

/** Simpan metode pembayaran yang ditampilkan Xendit. [] = semua metode yang aktif di akun. */
export async function PUT(request: NextRequest) {
  return withAdmin(request, async () => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Data tidak valid" }, 400);
    const bad = parsed.data.payment_channels.filter((c) => !VA_CODES.includes(c));
    if (bad.length) return json({ error: `Kanal tidak dikenal: ${bad.join(", ")}` }, 400);
    const ordered = VA_CODES.filter((c) => parsed.data.payment_channels.includes(c));
    await saveSettings({ payment_channels: ordered.join(",") });
    return json({ settings: await getSettings() });
  });
}
