import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool, isDbConfigured } from "@/lib/db";
import { DEFAULT_WHATSAPP } from "@/lib/whatsapp";

/** Tag cache kontak publik (nomor WhatsApp) untuk halaman statis. */
export const SITE_CONTACT_TAG = "site-contact";

/**
 * Nomor WhatsApp aktif untuk halaman statis (landing page). `use cache` → ikut di HTML statis, diperbarui
 * tiap ±1 menit atau segera setelah admin menyimpan (refreshPublicContact). Gagal → nomor cadangan.
 */
export async function getPublicWhatsapp(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SITE_CONTACT_TAG);
  if (!isDbConfigured()) return DEFAULT_WHATSAPP;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const [rows] = await Promise.race([
      getPool().query<RowDataPacket[]>("SELECT value FROM settings WHERE `key` = 'whatsapp_number' LIMIT 1"),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout 4s")), 4000);
      }),
    ]);
    const v = String(rows[0]?.value || "");
    return /^\d{10,15}$/.test(v) ? v : DEFAULT_WHATSAPP;
  } catch (e) {
    console.error("[public-contact]", (e as Error).message);
    return DEFAULT_WHATSAPP;
  } finally {
    clearTimeout(timer);
  }
}

export function refreshPublicContact() {
  revalidateTag(SITE_CONTACT_TAG, { expire: 0 });
}
