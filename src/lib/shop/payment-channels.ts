/**
 * Kanal Virtual Account Indonesia menurut tabel resmi Xendit
 * (https://docs.xendit.co/docs/available-payment-methods.md — kolom "Channel Code", min. nominal IDR).
 * Dipakai untuk `allowed_payment_channels` di POST /sessions. Kanal harus SUDAH diaktifkan di akun Xendit;
 * kalau tidak, Xendit menolak pembuatan sesi (INVALID_PAYMENT_CHANNEL).
 */
export const VA_CHANNELS = [
  { code: "BCA_VIRTUAL_ACCOUNT", label: "BCA", min: 10000 },
  { code: "BNI_VIRTUAL_ACCOUNT", label: "BNI", min: 1 },
  { code: "BRI_VIRTUAL_ACCOUNT", label: "BRI", min: 1 },
  { code: "MANDIRI_VIRTUAL_ACCOUNT", label: "Mandiri", min: 1 },
  { code: "PERMATA_VIRTUAL_ACCOUNT", label: "Permata", min: 1 },
  { code: "BSI_VIRTUAL_ACCOUNT", label: "BSI", min: 1 },
  { code: "CIMB_VIRTUAL_ACCOUNT", label: "CIMB Niaga", min: 1 },
  { code: "BJB_VIRTUAL_ACCOUNT", label: "BJB", min: 1 },
  { code: "BNC_VIRTUAL_ACCOUNT", label: "BNC (Neo Commerce)", min: 1 },
  { code: "BSS_VIRTUAL_ACCOUNT", label: "BSS (Sahabat Sampoerna)", min: 1 },
  { code: "HANA_VIRTUAL_ACCOUNT", label: "Hana Bank", min: 1 },
  { code: "MUAMALAT_VIRTUAL_ACCOUNT", label: "Muamalat", min: 1 },
] as const;

export const VA_CODES: readonly string[] = VA_CHANNELS.map((c) => c.code);
export const channelLabel = (code: string) => VA_CHANNELS.find((c) => c.code === code)?.label || code;

/** "BCA_VIRTUAL_ACCOUNT,BNI_VIRTUAL_ACCOUNT" → array kode valid (urut sesuai VA_CHANNELS). Kosong = semua metode. */
export function parseChannels(raw: string | null | undefined): string[] {
  const set = new Set((raw || "").split(",").map((s) => s.trim()).filter(Boolean));
  return VA_CODES.filter((c) => set.has(c));
}
