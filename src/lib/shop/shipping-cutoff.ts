/**
 * Batas jam pengiriman (permintaan tim marketing, 20 Nov 2026): pesanan yang pembayarannya diterima
 * di atas pukul 13.00 WIB dikirim keesokan harinya. Dihitung dari waktu PEMBAYARAN, karena pesanan baru
 * diproses setelah dibayar. Aman dipakai di server maupun browser.
 */
export const SHIP_CUTOFF_HOUR = 13;
export const SHIP_CUTOFF_LABEL = "13.00 WIB";
export const SHIP_CUTOFF_NOTE = `Pesanan yang pembayarannya kami terima di atas pukul ${SHIP_CUTOFF_LABEL} akan dikirim keesokan harinya.`;

/** Jam (0–23) dalam WIB. Indonesia tidak memakai jam musim panas, jadi WIB selalu UTC+7. */
const wibHour = (d: Date) => (d.getUTCHours() + 7) % 24;

/** true bila waktu tersebut pukul 13.00 WIB atau lebih (sampai 23.59) — pengiriman besok. */
export const isAfterShipCutoff = (d: Date) => wibHour(new Date(d)) >= SHIP_CUTOFF_HOUR;
