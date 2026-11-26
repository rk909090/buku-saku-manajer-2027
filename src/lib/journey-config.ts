/**
 * Daftar event perjalanan pengunjung (first-party, anonim) — dipakai pelacak di browser, API /api/journey,
 * dan dashboard /admin/journey. Hanya event di daftar ini yang diterima server.
 */

export const JOURNEY_EVENTS = [
  "session_start", // kedatangan baru (membawa UTM/referrer)
  "page_view", // halaman dibuka: "/", "/checkout", "/checkout/status"
  "section_view", // seksi landing terlihat (detail = id seksi)
  "scroll", // kedalaman gulir landing (value = 25/50/75/100)
  "cta_click", // tombol beli (detail = posisi tombol)
  "preview_open", // membuka "Intip isi buku" (detail = topik)
  "faq_open", // membuka pertanyaan FAQ (detail = nomor)
  "whatsapp_click", // klik tombol/tautan WhatsApp
  "begin_checkout", // halaman checkout tampil dengan isi keranjang
  "shipping_selected", // memilih kurir
  "coupon_applied", // kupon berhasil dipakai
  "pay_click", // menekan tombol bayar
  "page_leave", // meninggalkan/menyembunyikan halaman (value = detik aktif sejak laporan terakhir)
] as const;
export type JourneyEvent = (typeof JOURNEY_EVENTS)[number];

/** Sesi baru bila tidak ada aktivitas selama 30 menit (sama dengan GA4). */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Seksi landing page, berurutan dari atas (nilai atribut data-section). */
export const LANDING_SECTIONS = [
  { id: "hero", label: "Hero (headline)" },
  { id: "masalah", label: "Masalah manajer" },
  { id: "cerita", label: "Cerita" },
  { id: "untuk-siapa", label: "Untuk siapa" },
  { id: "tentang-buku", label: "Tentang buku" },
  { id: "daftar-bab", label: "Daftar bab" },
  { id: "intip-isi", label: "Intip isi buku" },
  { id: "pembaca", label: "Pembaca" },
  { id: "manfaat", label: "Manfaat" },
  { id: "penulis", label: "Penulis" },
  { id: "institut", label: "Human Plus Institute" },
  { id: "testimoni", label: "Testimoni" },
  { id: "penawaran", label: "Penawaran & harga" },
  { id: "faq", label: "FAQ" },
  { id: "penutup", label: "Penutup" },
] as const;
export const SECTION_IDS: readonly string[] = LANDING_SECTIONS.map((s) => s.id);
export const sectionLabel = (id: string | null | undefined) => LANDING_SECTIONS.find((s) => s.id === id)?.label ?? id ?? "—";

export const JOURNEY_PATHS = ["/", "/checkout", "/checkout/status"] as const;

export const EVENT_LABEL: Record<JourneyEvent, string> = {
  session_start: "Datang",
  page_view: "Buka halaman",
  section_view: "Lihat seksi",
  scroll: "Gulir",
  cta_click: "Klik beli",
  preview_open: "Intip isi buku",
  faq_open: "Buka FAQ",
  whatsapp_click: "Klik WhatsApp",
  begin_checkout: "Mulai checkout",
  shipping_selected: "Pilih kurir",
  coupon_applied: "Pakai kupon",
  pay_click: "Klik bayar",
  page_leave: "Tinggalkan halaman",
};
