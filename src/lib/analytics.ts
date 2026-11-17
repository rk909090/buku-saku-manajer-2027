/**
 * Konfigurasi pelacakan.
 *
 * GOOGLE_TAG_ID adalah Google tag milik properti GA4 "Buku Saku Manajer 2027"
 * (akun Humplus, property 564799693, measurement ID G-VCW01D9KTE, stream https://bsm.humplus.com).
 * Snippet-nya (src/app/layout.tsx) persis seperti di GA4 > Data streams > View tag instructions.
 * Konfigurasi GA4 + enhanced measurement (page_view, scroll, klik keluar, dll.) sudah ada di
 * dalam Google tag tersebut, jadi tidak perlu gtag('config').
 *
 * Yang ditambahkan oleh situs ini:
 *   - Saat halaman diparse (LandingPage):  gtag('set', { headline_variant, ab_experiment })
 *     → menempel di semua event GA4 halaman itu (termasuk page_view).
 *     Pratinjau internal (?hl=) juga: gtag('set', { traffic_type: 'internal' }).
 *   - Saat tombol CTA diklik (ab-tracker.tsx):
 *     gtag('event', 'marketplace_click', { marketplace, cta_placement, headline_variant, ab_experiment })
 *     → ditandai sebagai key event di GA4.
 *   - dataLayer juga menerima objek { event: 'ab_headline_view' | 'ab_cta_click', ... } untuk
 *     dipakai bila nanti memakai container Google Tag Manager biasa.
 */
export const GOOGLE_TAG_ID = "GTM-KFQV25X2";

/** Nama event GA4 untuk klik tombol beli (key event). */
export const GA_CTA_EVENT = "marketplace_click";
