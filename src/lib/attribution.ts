/**
 * Atribusi kunjungan (UTM, click ID iklan, referrer) — modul murni, dipakai di browser, server, dan dashboard.
 *
 * - "Touch" = satu kedatangan ke situs: parameter UTM, jenis click ID (gclid/fbclid/…), host perujuk,
 *   dan halaman pendaratan. Nilai click ID-nya sendiri TIDAK disimpan (cukup jenisnya).
 * - Pesanan menyimpan touch terakhir yang BUKAN "langsung" (last non-direct click, standar GA) beserta
 *   touch pertama, sehingga pembeli yang kembali lewat bookmark tetap tercatat dari kampanye asalnya.
 * - UTM berasal dari URL yang dibuka pembeli (bisa diketik siapa saja) — cukup untuk analisa
 *   pemasaran, bukan bukti.
 */

export type Touch = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  /** gclid | gbraid | wbraid | fbclid | ttclid | msclkid | li_fat_id */
  clickIdType: string | null;
  /** Host perujuk eksternal (tanpa path), mis. "www.google.com". */
  referrerHost: string | null;
  /** Path halaman pendaratan (tanpa query), mis. "/" atau "/checkout". */
  landingPath: string | null;
  /** Waktu (ms epoch). */
  ts: number;
};

export type Attribution = { first: Touch | null; last: Touch | null };

const CLICK_IDS = ["gclid", "gbraid", "wbraid", "fbclid", "ttclid", "msclkid", "li_fat_id"] as const;
const LIMITS = { source: 100, medium: 100, campaign: 150, term: 150, content: 150, referrerHost: 190, landingPath: 190 };

const clean = (v: unknown, max: number, lower = false) => {
  if (typeof v !== "string") return null;
  // Buang karakter kontrol; rapikan spasi.
  let s = v.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (lower) s = s.toLowerCase();
  return s ? s.slice(0, max) : null;
};

/** Normalisasi touch dari sumber tak tepercaya (body request / localStorage). null bila bentuknya salah. */
export function sanitizeTouch(t: unknown): Touch | null {
  if (!t || typeof t !== "object") return null;
  const o = t as Record<string, unknown>;
  const clickIdType = typeof o.clickIdType === "string" && (CLICK_IDS as readonly string[]).includes(o.clickIdType) ? o.clickIdType : null;
  const ts = typeof o.ts === "number" && Number.isFinite(o.ts) ? Math.round(o.ts) : Date.now();
  let landingPath = clean(o.landingPath, LIMITS.landingPath);
  if (landingPath && !landingPath.startsWith("/")) landingPath = null;
  return {
    source: clean(o.source, LIMITS.source, true),
    medium: clean(o.medium, LIMITS.medium, true),
    campaign: clean(o.campaign, LIMITS.campaign),
    term: clean(o.term, LIMITS.term),
    content: clean(o.content, LIMITS.content),
    clickIdType,
    referrerHost: clean(o.referrerHost, LIMITS.referrerHost, true),
    landingPath,
    ts,
  };
}

/**
 * Perujuk yang bukan sumber kunjungan: halaman pembayaran (pembeli kembali dari Xendit setelah bayar)
 * — bila dihitung, pembayaran akan terbaca sebagai "kunjungan baru dari xendit".
 */
const IGNORED_REFERRER_RE = /(^|\.)xendit\.co$/;

/** Touch dari URL halaman & document.referrer. Perujuk dari domain sendiri / pembayaran diabaikan. */
export function touchFromLocation(href: string, referrer: string, ownHost: string, now = Date.now()): Touch {
  const url = new URL(href);
  const q = url.searchParams;
  const clickIdType = CLICK_IDS.find((k) => q.get(k)) ?? null;
  let referrerHost: string | null = null;
  try {
    if (referrer) {
      const r = new URL(referrer);
      const h = r.host.toLowerCase();
      if (h && h !== ownHost.toLowerCase() && !IGNORED_REFERRER_RE.test(h)) referrerHost = h;
    }
  } catch {
    /* referrer tidak valid → abaikan */
  }
  return (
    sanitizeTouch({
      source: q.get("utm_source"),
      medium: q.get("utm_medium"),
      campaign: q.get("utm_campaign"),
      term: q.get("utm_term"),
      content: q.get("utm_content"),
      clickIdType,
      referrerHost,
      landingPath: url.pathname,
      ts: now,
    }) as Touch
  );
}

/** "Langsung" = tanpa UTM, tanpa click ID, tanpa perujuk eksternal. */
export const isDirect = (t: Touch | null | undefined) => !t || (!t.source && !t.medium && !t.campaign && !t.clickIdType && !t.referrerHost);

/** Perbarui atribusi tersimpan dengan touch baru (first = sekali; last = touch non-langsung terbaru). */
export function mergeAttribution(prev: Attribution | null, t: Touch): Attribution {
  const first = prev?.first ?? t;
  const last = isDirect(t) ? (prev?.last ?? (isDirect(first) ? null : first)) : t;
  return { first, last };
}

/* ───────────── Kanal ───────────── */

export const CHANNELS = [
  "Iklan Google",
  "Iklan Meta",
  "Iklan TikTok",
  "Iklan lainnya",
  "Pencarian organik",
  "Media sosial",
  "WhatsApp",
  "Email",
  "Situs Human Plus",
  "Referral",
  "Kampanye lain (UTM)",
  "Langsung",
] as const;
export type Channel = (typeof CHANNELS)[number];

const SEARCH_RE = /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia|search\.brave)\./;
const SOCIAL_RE = /(^|\.)(facebook|fb|instagram|t\.co|twitter|x\.com|linkedin|lnkd\.in|tiktok|youtube|youtu\.be|threads|pinterest|reddit|telegram)\b/;
const META_SRC = /^(facebook|fb|instagram|ig|meta|messenger|audience_network)$/;
const PAID_MEDIUM = /^(cpc|ppc|paid|paidsearch|paid_search|paid-search|cpm|cpv|cpa|display|banner|ads?|paid_social|paidsocial|paid-social|social_paid|social-paid|sponsored)$/;

/**
 * Kelompok kanal dari satu touch. Urutan aturan: click ID iklan → UTM medium/source → perujuk → langsung.
 * Catatan: fbclid juga ditempel Facebook pada link organik, jadi tanpa utm_medium berbayar dihitung "Media sosial".
 */
export function classifyChannel(t: Touch | null | undefined): Channel {
  if (!t || isDirect(t)) return "Langsung";
  const src = t.source || "";
  const med = t.medium || "";
  const ref = t.referrerHost || "";
  const paid = PAID_MEDIUM.test(med);

  if (t.clickIdType === "gclid" || t.clickIdType === "gbraid" || t.clickIdType === "wbraid") return "Iklan Google";
  if (t.clickIdType === "ttclid") return "Iklan TikTok";
  if (t.clickIdType === "msclkid" || t.clickIdType === "li_fat_id") return "Iklan lainnya";

  if (src || med) {
    if (paid) {
      if (/google|youtube|gdn|adwords/.test(src)) return "Iklan Google";
      if (META_SRC.test(src)) return "Iklan Meta";
      if (/tiktok/.test(src)) return "Iklan TikTok";
      return "Iklan lainnya";
    }
    if (/whatsapp|^wa$/.test(src) || /whatsapp|^wa$/.test(med)) return "WhatsApp";
    if (/e-?mail|newsletter/.test(med) || /e-?mail|newsletter/.test(src)) return "Email";
    if (/social|sosmed|^sm$|organic_social/.test(med) || META_SRC.test(src) || /tiktok|twitter|linkedin|youtube|threads|^x$/.test(src)) return "Media sosial";
    if (med === "organic" || /^(google|bing|yahoo)$/.test(src)) return "Pencarian organik";
    if (/humplus/.test(src)) return "Situs Human Plus";
    if (med === "referral") return "Referral";
    return "Kampanye lain (UTM)";
  }

  if (t.clickIdType === "fbclid") return "Media sosial";
  if (/(^|\.)humplus\.(com|co\.id)$/.test(ref) || /(^|\.)humanplus\.co\.id$/.test(ref)) return "Situs Human Plus";
  if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(ref)) return "WhatsApp";
  if (SEARCH_RE.test(ref)) return "Pencarian organik";
  if (SOCIAL_RE.test(ref)) return "Media sosial";
  if (/mail\./.test(ref)) return "Email";
  return "Referral";
}

/** Label sumber ringkas untuk tabel: "google / cpc", "www.instagram.com", "(langsung)". */
export function sourceLabel(t: Pick<Touch, "source" | "medium" | "referrerHost" | "clickIdType"> | null | undefined) {
  if (!t) return "(langsung)";
  if (t.source || t.medium) return `${t.source || "(tanpa source)"} / ${t.medium || "(tanpa medium)"}`;
  if (t.referrerHost) return t.referrerHost;
  if (t.clickIdType) return `(${t.clickIdType} tanpa UTM)`;
  return "(langsung)";
}
