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

/** ISO/Date → nilai <input type="datetime-local"> dalam WIB ("YYYY-MM-DDTHH:mm"). */
export function toWibInput(v: string | Date | null | undefined): string {
  if (!v) return "";
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return "";
  return new Date(t + 7 * 3600_000).toISOString().slice(0, 16);
}

/** Nilai <input type="datetime-local"> (dibaca sebagai WIB) → ISO dengan offset +07:00. */
export function fromWibInput(v: string): string | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? `${v}:00+07:00` : null;
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
