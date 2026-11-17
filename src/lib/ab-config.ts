/**
 * Konfigurasi A/B test headline hero.
 * File ini sengaja kecil (tanpa copywriting) karena juga dipakai oleh src/proxy.ts.
 */

/** ID varian. Harus sama dengan `id` di headlineVariants (src/lib/content.ts). */
export const AB_VARIANTS = ["a", "b", "c"] as const;
export type AbVariantId = (typeof AB_VARIANTS)[number];

/** Nama eksperimen; ganti bila memulai eksperimen baru supaya pengunjung dibagi ulang. */
export const AB_EXPERIMENT = "hero_headline_v1";

/** Cookie yang menyimpan varian pengunjung agar headline tetap sama di kunjungan berikutnya. */
export const AB_COOKIE = "bsm_ab_hero";
export const AB_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

/**
 * ID acak anonim per browser (UUID), dipakai untuk menghitung pengunjung unik dan
 * conversion rate per pengunjung. Tidak berisi data pribadi.
 */
export const AB_VISITOR_COOKIE = "bsm_vid";
export const AB_VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 tahun

/** Nama event yang diterima oleh /api/ab. */
export const AB_EVENTS = ["ab_headline_view", "ab_cta_click"] as const;
export type AbEventName = (typeof AB_EVENTS)[number];

/** Posisi tombol CTA yang sah (nilai atribut data-cta). */
export const AB_PLACEMENTS = [
  "header",
  "hero",
  "audience",
  "chapters",
  "outcomes",
  "offer",
  "closing",
  "mobile-bar",
] as const;

/** Tujuan tombol CTA (nilai atribut data-mp). Sejak 17 Nov 2026 semua tombol ke checkout situs. */
export const AB_MARKETPLACES = ["checkout", "shopee", "tokopedia"] as const; // shopee/tokopedia: data lama

/** Parameter URL untuk memaksa varian saat QA, mis. /?hl=b (tidak mengubah cookie). */
export const AB_QUERY_PARAM = "hl";

export function isAbVariant(v: string | undefined | null): v is AbVariantId {
  return !!v && (AB_VARIANTS as readonly string[]).includes(v);
}
