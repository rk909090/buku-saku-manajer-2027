/**
 * Jadwal pengiriman (aman dipakai di server maupun browser; tanpa akses database).
 *
 * Aturan (permintaan tim marketing, 20 Nov 2026):
 * - Pesanan yang PEMBAYARANNYA diterima pada/di atas jam batas (default 13.00 WIB) dikirim keesokan harinya.
 *   Dihitung dari waktu pembayaran karena pesanan baru diproses setelah lunas.
 * - Kurir tetap beroperasi di akhir pekan & tanggal merah, jadi hari-hari itu TIDAK otomatis libur.
 * - Admin bisa mengisi "libur pengiriman" (rentang tanggal). Pesanan yang jatuh jadwalnya pada hari libur
 *   dikirim pada hari pertama setelah libur.
 * Semua tanggal berupa teks "YYYY-MM-DD" dalam WIB (UTC+7; Indonesia tidak memakai jam musim panas).
 */

export type Holiday = { start: string; end: string; label: string };
export type ShipConfig = { cutoff: string; holidays: Holiday[] };
export type ShipSchedule = {
  /** Tanggal kirim (WIB). */
  date: string;
  /** Tanggal pembayaran (WIB). */
  paidDate: string;
  /** Dibayar pada/di atas jam batas. */
  afterCutoff: boolean;
  /** Libur pertama yang menggeser jadwal (bila ada). */
  holiday: Holiday | null;
};

export const DEFAULT_CUTOFF = "13:00";
export const DEFAULT_SHIP_CONFIG: ShipConfig = { cutoff: DEFAULT_CUTOFF, holidays: [] };
/** Libur yang diumumkan ke pembeli bila sedang berlangsung atau dimulai dalam N hari ke depan. */
export const HOLIDAY_NOTICE_DAYS = 14;

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;

/** true bila "YYYY-MM-DD" adalah tanggal kalender yang valid (mis. menolak 2026-02-30). */
export function isYmd(s: string) {
  if (!YMD.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}

export const addDays = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** Tanggal & menit-dalam-hari menurut WIB. */
export function wib(d: Date | string | number) {
  const t = new Date(new Date(d).getTime() + 7 * 3_600_000);
  return { date: t.toISOString().slice(0, 10), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

export const isCutoff = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const cutoffMinutes = (s: string) => {
  const v = isCutoff(s) ? s : DEFAULT_CUTOFF;
  return Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5));
};
/** "13:00" → "13.00 WIB" (format jam Indonesia). */
export const cutoffLabel = (s: string) => `${(isCutoff(s) ? s : DEFAULT_CUTOFF).replace(":", ".")} WIB`;

/** Baca daftar libur dari pengaturan (JSON). Data rusak/invalid diabaikan, bukan menggagalkan halaman. */
export function parseHolidays(raw: unknown): Holiday[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw || "[]");
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((h): h is Holiday => !!h && typeof h === "object" && isYmd(String(h.start)) && isYmd(String(h.end)) && String(h.end) >= String(h.start))
    .map((h) => ({ start: String(h.start), end: String(h.end), label: String(h.label || "").slice(0, 60) }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function toShipConfig(cutoff: unknown, holidays: unknown): ShipConfig {
  return { cutoff: isCutoff(String(cutoff || "")) ? String(cutoff) : DEFAULT_CUTOFF, holidays: parseHolidays(holidays) };
}

const holidayOn = (ymd: string, holidays: Holiday[]) => holidays.find((h) => h.start <= ymd && ymd <= h.end);

/** Hari kirim pertama pada/sesudah `ymd` yang bukan hari libur. */
export function firstShipDay(ymd: string, holidays: Holiday[]) {
  let d = ymd;
  // Batas iterasi: libur yang bersambung tetap selesai, data aneh tidak membuat loop tanpa akhir.
  for (let i = 0; i < 400; i++) {
    const h = holidayOn(d, holidays);
    if (!h) return { date: d, holiday: null as Holiday | null };
    d = addDays(h.end, 1);
  }
  return { date: d, holiday: null as Holiday | null };
}

/** Jadwal kirim untuk pembayaran pada waktu `paidAt`. */
export function shipScheduleFor(paidAt: Date | string, cfg: ShipConfig): ShipSchedule {
  const { date: paidDate, minutes } = wib(paidAt);
  const afterCutoff = minutes >= cutoffMinutes(cfg.cutoff);
  const candidate = afterCutoff ? addDays(paidDate, 1) : paidDate;
  const holiday = holidayOn(candidate, cfg.holidays) || null;
  return { date: firstShipDay(candidate, cfg.holidays).date, paidDate, afterCutoff, holiday };
}

/* ───────────── Format teks ───────────── */

const fmt = (ymd: string, o: Intl.DateTimeFormatOptions) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString("id-ID", { ...o, timeZone: "UTC" });
/** "Sabtu, 21 November 2026" */
export const formatShipDate = (ymd: string) => fmt(ymd, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
/** "Sab, 21 Nov" */
export const formatShipDateShort = (ymd: string) => fmt(ymd, { weekday: "short", day: "numeric", month: "short" });

/** "25 Desember 2026", "25–28 Desember 2026", atau "31 Desember 2026 – 2 Januari 2027". */
export function formatHolidayRange(h: Holiday) {
  if (h.start === h.end) return fmt(h.start, { day: "numeric", month: "long", year: "numeric" });
  const sameMonth = h.start.slice(0, 7) === h.end.slice(0, 7);
  if (sameMonth) return `${Number(h.start.slice(8))}–${fmt(h.end, { day: "numeric", month: "long", year: "numeric" })}`;
  return `${fmt(h.start, { day: "numeric", month: "long", year: "numeric" })} – ${fmt(h.end, { day: "numeric", month: "long", year: "numeric" })}`;
}

const holidayName = (h: Holiday) => `libur pengiriman ${formatHolidayRange(h)}${h.label ? ` (${h.label})` : ""}`;

/** Aturan umum jam batas. */
export const cutoffNote = (cfg: ShipConfig) =>
  `Pesanan yang pembayarannya kami terima di atas pukul ${cutoffLabel(cfg.cutoff)} akan dikirim keesokan harinya.`;

/** Libur yang sedang berlangsung atau segera dimulai (untuk diumumkan ke pembeli). */
export function upcomingHolidays(cfg: ShipConfig, now: Date | string | number = Date.now(), days = HOLIDAY_NOTICE_DAYS) {
  const today = wib(now).date;
  const until = addDays(today, days);
  return cfg.holidays.filter((h) => h.end >= today && h.start <= until);
}

/** Kalimat pengumuman libur, mis. "Libur pengiriman 25–28 Desember 2026 (Natal): pesanan yang dibayar selama libur dikirim pada Selasa, 29 Desember 2026." */
export function holidayNotice(h: Holiday, cfg: ShipConfig) {
  const resume = firstShipDay(addDays(h.end, 1), cfg.holidays).date;
  const name = holidayName(h);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}: pesanan yang dibayar selama libur dikirim pada ${formatShipDate(resume)}.`;
}

/** Info pengiriman untuk pembeli sebelum membayar: aturan jam batas + libur terdekat. */
export function publicShipNotes(cfg: ShipConfig, now: Date | string | number = Date.now()) {
  return [cutoffNote(cfg), ...upcomingHolidays(cfg, now).map((h) => holidayNotice(h, cfg))];
}

/**
 * Kalimat jadwal untuk pesanan yang sudah dibayar, HANYA bila pengiriman tidak di hari pembayaran
 * (jam batas terlewati atau libur). Untuk pembayaran sebelum jam batas di hari kirim, null — kita tidak
 * menjanjikan "dikirim hari ini" karena aturan dari tim marketing hanya menyebut pembayaran di atas jam batas.
 */
export function scheduleSentence(s: ShipSchedule, cfg: ShipConfig): string | null {
  if (s.date === s.paidDate) return null;
  const when = formatShipDate(s.date);
  if (s.holiday) return `Karena ${holidayName(s.holiday)}, pesanan Anda akan dikirim pada ${when}.`;
  return `Pembayaran Anda kami terima di atas pukul ${cutoffLabel(cfg.cutoff)}, sehingga pesanan akan dikirim pada ${when}.`;
}

/** Label singkat untuk admin, relatif terhadap hari ini (WIB). */
export function adminShipLabel(date: string, now: Date | string | number = Date.now()): { text: string; tone: "green" | "blue" | "amber" | "red" } {
  const today = wib(now).date;
  if (date === today) return { text: "Kirim hari ini", tone: "green" };
  if (date === addDays(today, 1)) return { text: `Kirim besok · ${formatShipDateShort(date)}`, tone: "blue" };
  if (date > today) return { text: `Kirim ${formatShipDateShort(date)}`, tone: "blue" };
  return { text: `Lewat jadwal · ${formatShipDateShort(date)}`, tone: "red" };
}
