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

/** Panjang maksimal teks sapaan (pesan yang sudah terisi saat pembeli membuka chat). */
export const MAX_WA_GREETING = 500;

/** Rapikan teks sapaan dari admin: baris baru seragam, spasi di ujung baris dibuang, maks. 1 baris kosong. */
export const normalizeGreeting = (raw: string) =>
  raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/**
 * Tautan chat WhatsApp. `text` (opsional) = pesan yang sudah terisi di kolom ketik pembeli
 * (format resmi WhatsApp: wa.me/<nomor>?text=<pesan ter-encode>). Kosong → tanpa pesan.
 */
export function waLink(number: string | null | undefined, text?: string | null) {
  const base = `https://wa.me/${number || DEFAULT_WHATSAPP}`;
  const t = (text || "").trim();
  return t ? `${base}?text=${encodeURIComponent(t)}` : base;
}

/** Sapaan untuk tautan dari email pesanan: sapaan admin + nomor pesanan. Sapaan kosong → tanpa pesan. */
export const orderGreeting = (greeting: string | null | undefined, orderNumber: string) => {
  const g = (greeting || "").trim();
  return g ? `${g}\n\nNo. pesanan: ${orderNumber}` : "";
};

/** Tampilan ramah: 6287840848566 → +62 878-4084-8566 (khusus nomor Indonesia; lainnya +angka). */
export function formatWhatsapp(number: string) {
  if (!number.startsWith("62")) return `+${number}`;
  const rest = number.slice(2);
  return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
}
