import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool, isDbConfigured } from "@/lib/db";
import { DEFAULT_WHATSAPP } from "@/lib/whatsapp";

/** Tag cache kontak publik (nomor WhatsApp) untuk halaman statis. */
export const SITE_CONTACT_TAG = "site-contact";

export type PublicContact = { whatsapp: string; greeting: string };

/**
 * Nomor WhatsApp & teks sapaan aktif untuk halaman statis (landing page). `use cache` → ikut di HTML
 * statis, diperbarui tiap ±1 menit atau segera setelah admin menyimpan (refreshPublicContact).
 * Gagal → nomor cadangan tanpa sapaan.
 */
export async function getPublicContact(): Promise<PublicContact> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SITE_CONTACT_TAG);
  if (!isDbConfigured()) return { whatsapp: DEFAULT_WHATSAPP, greeting: "" };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const [rows] = await Promise.race([
      getPool().query<RowDataPacket[]>("SELECT `key`, value FROM settings WHERE `key` IN ('whatsapp_number','whatsapp_greeting')"),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout 4s")), 4000);
      }),
    ]);
    const v = Object.fromEntries(rows.map((r) => [String(r.key), String(r.value ?? "")]));
    return {
      whatsapp: /^\d{10,15}$/.test(v.whatsapp_number || "") ? v.whatsapp_number : DEFAULT_WHATSAPP,
      greeting: (v.whatsapp_greeting || "").slice(0, 500),
    };
  } catch (e) {
    console.error("[public-contact]", (e as Error).message);
    return { whatsapp: DEFAULT_WHATSAPP, greeting: "" };
  } finally {
    clearTimeout(timer);
  }
}

export function refreshPublicContact() {
  revalidateTag(SITE_CONTACT_TAG, { expire: 0 });
}
