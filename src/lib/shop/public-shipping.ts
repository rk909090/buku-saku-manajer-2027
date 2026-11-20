import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool, isDbConfigured } from "@/lib/db";
import { DEFAULT_SHIP_CONFIG, toShipConfig, type ShipConfig } from "@/lib/shop/shipping-schedule";

/** Tag cache jadwal kirim (jam batas & libur) untuk halaman statis (FAQ landing page, llms.txt). */
export const SITE_SHIPPING_TAG = "site-shipping";

/**
 * Jam batas & libur pengiriman untuk halaman statis. `use cache` → ikut di HTML statis, diperbarui tiap
 * ±1 menit atau segera setelah admin menyimpan (refreshPublicShipping). Gagal → default (13.00, tanpa libur).
 */
export async function getPublicShipConfig(): Promise<ShipConfig> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SITE_SHIPPING_TAG);
  if (!isDbConfigured()) return DEFAULT_SHIP_CONFIG;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const [rows] = await Promise.race([
      getPool().query<RowDataPacket[]>("SELECT `key`, value FROM settings WHERE `key` IN ('ship_cutoff','ship_holidays')"),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout 4s")), 4000);
      }),
    ]);
    const v = Object.fromEntries(rows.map((r) => [String(r.key), r.value]));
    return toShipConfig(v.ship_cutoff, v.ship_holidays);
  } catch (e) {
    console.error("[public-shipping]", (e as Error).message);
    return DEFAULT_SHIP_CONFIG;
  } finally {
    clearTimeout(timer);
  }
}

export function refreshPublicShipping() {
  revalidateTag(SITE_SHIPPING_TAG, { expire: 0 });
}
