/**
 * Nomor WhatsApp toko. Nilai aktif diatur admin (Dashboard → Pengaturan → Kontak WhatsApp) dan disimpan
 * di tabel settings; konstanta ini hanya cadangan bila database tidak tersedia.
 */
export const DEFAULT_WHATSAPP = "6287840848566";

/** Normalisasi masukan admin: "0878-4084 8566" / "+62 878…" / "62878…" → "62878…". null bila tidak valid. */
export function normalizeWhatsapp(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  if (d.length < 10 || d.length > 15) return null;
  return d;
}

export const waLink = (number: string | null | undefined) => `https://wa.me/${number || DEFAULT_WHATSAPP}`;

/** Tampilan ramah: 6287840848566 → +62 878-4084-8566 (khusus nomor Indonesia; lainnya +angka). */
export function formatWhatsapp(number: string) {
  if (!number.startsWith("62")) return `+${number}`;
  const rest = number.slice(2);
  return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
}
