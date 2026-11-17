/** Utilitas format yang aman dipakai di server maupun browser. */

export function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

/** Label & warna status pesanan (dipakai checkout status & dashboard). */
export const ORDER_STATUS: Record<string, { label: string; tone: "amber" | "blue" | "violet" | "green" | "slate" | "red" }> = {
  pending_payment: { label: "Menunggu pembayaran", tone: "amber" },
  paid: { label: "Dibayar", tone: "blue" },
  processing: { label: "Diproses", tone: "violet" },
  shipped: { label: "Dikirim", tone: "violet" },
  completed: { label: "Selesai", tone: "green" },
  expired: { label: "Kedaluwarsa", tone: "slate" },
  cancelled: { label: "Dibatalkan", tone: "red" },
};
