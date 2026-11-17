import { discountAmount } from "@/lib/shop/pricing";

/**
 * Data diskon untuk landing page (dari DB lewat getLandingPromo) dan pemilihan diskon yang sedang
 * berlaku. Murni (tanpa DB) — dipakai di server dan browser.
 */
export type PromoDiscount = {
  name: string;
  type: "percent" | "fixed";
  value: number;
  startsAt: string | null;
  endsAt: string | null;
  /** Berlaku saat data diambil server (dipakai sebelum jam browser tersedia, agar HTML server = render pertama). */
  liveAtRender: boolean;
};

export type LandingPromo = { basePrice: number; discounts: PromoDiscount[] };

export type Deal = { name: string; basePrice: number; price: number; percentOff: number; endsAt: number | null };

/** Diskon terbaik yang berlaku pada `now` (ms). `now` null = pakai status saat data diambil server. */
export function currentDeal(promo: LandingPromo | null, now: number | null): Deal | null {
  if (!promo) return null;
  let best: Deal | null = null;
  let bestAmount = 0;
  for (const d of promo.discounts) {
    const live =
      now == null
        ? d.liveAtRender
        : (!d.startsAt || Date.parse(d.startsAt) <= now) && (!d.endsAt || Date.parse(d.endsAt) > now);
    if (!live) continue;
    const amount = discountAmount(promo.basePrice, d);
    if (amount > bestAmount) {
      bestAmount = amount;
      best = {
        name: d.name,
        basePrice: promo.basePrice,
        price: promo.basePrice - amount,
        percentOff: Math.round((amount / promo.basePrice) * 100),
        endsAt: d.endsAt ? Date.parse(d.endsAt) : null,
      };
    }
  }
  return best;
}

/** Sisa waktu → hari/jam/menit/detik. */
export function splitRemaining(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}
