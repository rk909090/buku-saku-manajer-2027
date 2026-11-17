import "server-only";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool, isDbConfigured } from "@/lib/db";
import type { LandingPromo } from "@/lib/promo-deal";

/** Tag cache data promo landing page; di-invalidasi saat admin mengubah diskon atau produk. */
export const LANDING_PROMO_TAG = "landing-promo";
const SLUG = "buku-saku-manajer";

/**
 * Harga dasar & diskon (berlaku / terjadwal) untuk landing page. Disimpan dengan `use cache` sehingga ikut
 * di HTML statis (tanpa geseran layout) dan diperbarui tiap ±1 menit (profil "minutes") atau segera setelah
 * revalidateTag(LANDING_PROMO_TAG). Waktu mulai/berakhir dievaluasi ulang di browser per detik.
 * Gagal / DB tidak tersedia → null (landing tampil normal tanpa promo).
 */
export async function getLandingPromo(): Promise<LandingPromo | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(LANDING_PROMO_TAG);
  if (!isDbConfigured()) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      load(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout 4s")), 4000);
      }),
    ]);
  } catch (e) {
    console.error("[landing-promo]", (e as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function load(): Promise<LandingPromo | null> {
  const pool = getPool();
  const [p] = await pool.query<RowDataPacket[]>("SELECT id, price, active FROM products WHERE slug = ? LIMIT 1", [SLUG]);
  if (!p[0] || !p[0].active) return null;
  // Waktu dibandingkan di MySQL dalam UTC (kolom DATETIME disimpan UTC; pool memakai timezone "Z").
  const [d] = await pool.query<RowDataPacket[]>(
    `SELECT name, type, value, starts_at, ends_at, (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP(3)) AS live
       FROM discounts
      WHERE active = 1 AND (product_id IS NULL OR product_id = ?) AND (ends_at IS NULL OR ends_at > UTC_TIMESTAMP(3))
      ORDER BY id`,
    [p[0].id]
  );
  const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : null);
  return {
    basePrice: Number(p[0].price),
    discounts: d.map((r) => ({
      name: String(r.name),
      type: r.type === "fixed" ? "fixed" : "percent",
      value: Number(r.value),
      startsAt: iso(r.starts_at),
      endsAt: iso(r.ends_at),
      liveAtRender: Number(r.live) === 1,
    })),
  };
}

/**
 * Dipanggil setelah admin mengubah diskon/produk. `expire: 0` = permintaan berikutnya langsung memakai data
 * baru (bukan konten lama) — dokumentasi revalidateTag Next.js 16.
 */
export function refreshLandingPromo() {
  revalidateTag(LANDING_PROMO_TAG, { expire: 0 });
}
