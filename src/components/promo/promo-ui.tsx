"use client";

import { useEffect, useSyncExternalStore } from "react";
import { price as staticPrice, priceNote } from "@/lib/content";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { currentDeal, splitRemaining, type Deal, type LandingPromo } from "@/lib/promo-deal";

/* ───────────── Jam bersama (1 interval untuk semua komponen) ───────────── */

let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribeClock(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const noSubscribe = () => () => {};
const getNow = () => now || (now = Date.now());
const getServerNow = () => null;

/**
 * Diskon yang berlaku sekarang. Render server & hidrasi memakai status saat data diambil server
 * (`liveAtRender`), lalu beralih ke jam browser — sehingga promo yang berakhir/mulai saat halaman
 * terbuka langsung ter-update tanpa reload.
 */
function useDeal(promo: LandingPromo | null): { deal: Deal | null; now: number | null } {
  const timed = !!promo?.discounts.some((d) => d.startsAt || d.endsAt);
  const t = useSyncExternalStore(timed ? subscribeClock : noSubscribe, timed ? getNow : getServerNow, getServerNow);
  return { deal: currentDeal(promo, t), now: t };
}

const pad = (n: number) => String(n).padStart(2, "0");

function FlameIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13.5 2.2c.3 2.6-.7 4.4-2.1 6-1.3 1.5-2.9 3-2.9 5.6 0 1.4.6 2.6 1.6 3.4-.1-.3-.1-.6-.1-.9 0-1.9 1.4-3 2.5-4.2.6.9 1.6 1.7 1.6 3.4 0 .6-.2 1.2-.5 1.7 2-.6 3.4-2.4 3.4-4.6 0-1.6-.6-2.8-1.3-3.9 1.4.5 2.6 1.5 3.4 2.8.4.8.6 1.6.6 2.6 0 4-3.3 7.2-7.4 7.2S4.9 18.1 4.9 14.1c0-3.5 2-5.6 3.9-7.5 1.6-1.6 3.2-3 4.7-4.4Z" />
    </svg>
  );
}

/* ───────────── Harga (dengan / tanpa diskon) ───────────── */

/** Pengganti PriceTag di bagian gelap landing page: harga coret + harga promo bila ada diskon aktif. */
export function PromoPriceTag({
  promo,
  align = "responsive",
}: {
  promo: LandingPromo | null;
  /** responsive = tengah di mobile, kiri di desktop (hero). */
  align?: "responsive" | "left" | "center";
}) {
  const { deal } = useDeal(promo);
  const base = promo ? formatRupiah(promo.basePrice) : staticPrice;
  const justify = { responsive: "justify-center lg:justify-start", left: "", center: "justify-center" }[align];
  const items = { responsive: "items-center lg:items-start", left: "items-start", center: "items-center" }[align];
  if (!deal) {
    return (
      <p className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${justify}`}>
        <span className="gold-text font-display text-4xl font-bold tracking-tight sm:text-5xl">{base}</span>
        <span className="text-sm font-semibold text-white/70">{priceNote}</span>
      </p>
    );
  }
  return (
    <div className={`flex w-full flex-col gap-1.5 ${items}`}>
      <p className={`flex flex-wrap items-center gap-2 ${justify}`}>
        <s className="text-lg font-semibold text-white/55 decoration-promo decoration-2">{formatRupiah(deal.basePrice)}</s>
        <span className="rounded-full bg-promo px-2.5 py-0.5 text-xs font-extrabold tracking-wide text-white uppercase shadow-[0_6px_16px_-6px_rgb(217_45_45/0.8)]">
          Hemat {deal.percentOff}%
        </span>
      </p>
      <p className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${justify}`}>
        <span className="gold-text font-display text-4xl font-bold tracking-tight sm:text-5xl">{formatRupiah(deal.price)}</span>
        <span className="text-sm font-semibold text-white/70">{priceNote}</span>
      </p>
    </div>
  );
}

/** Harga satu baris (mis. tabel Detail Buku). */
export function PromoPriceText({ promo, fallback }: { promo: LandingPromo | null; fallback: string }) {
  const { deal } = useDeal(promo);
  if (!deal) return <>{promo ? formatRupiah(promo.basePrice) : fallback}</>;
  return (
    <>
      <s className="mr-1.5 text-white/50">{formatRupiah(deal.basePrice)}</s>
      {formatRupiah(deal.price)} <span className="text-gold-300">({deal.name})</span>
    </>
  );
}

/* ───────────── Kartu hitung mundur ───────────── */

/**
 * Hitung mundur sampai diskon berakhir (waktu asli dari database). Tidak tampil bila tidak ada diskon
 * aktif atau diskon tanpa tanggal berakhir. Kurang dari 1 jam → tampilan "segera berakhir" (merah).
 */
export function PromoCountdown({ promo, className = "" }: { promo: LandingPromo | null; className?: string }) {
  const { deal, now } = useDeal(promo);
  if (!deal || deal.endsAt == null) return null;
  const left = now == null ? null : splitRemaining(deal.endsAt - now);
  const urgent = now != null && deal.endsAt - now < 3600_000;
  const units = [
    ...(left == null || left.days > 0 ? [{ v: left?.days, l: "Hari" }] : []),
    { v: left?.hours, l: "Jam" },
    { v: left?.minutes, l: "Menit" },
    { v: left?.seconds, l: "Detik" },
  ];
  const tile = urgent
    ? "from-rose-50 to-rose-200 text-promo-dark ring-rose-300/60"
    : "from-white via-cream to-gold-300 text-navy-950 ring-white/70";
  return (
    <div
      className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-gold-400/35 bg-gradient-to-br from-white/[0.12] to-white/[0.03] p-4 text-left shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)] backdrop-blur-sm sm:p-5 ${className}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-12 -right-10 size-36 rounded-full bg-gold-500/25 blur-2xl" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-gold-300">
          <FlameIcon className={`size-4 shrink-0 text-promo ${urgent ? "animate-pulse" : ""}`} />
          <span className="truncate">{deal.name}</span>
        </p>
        <span className="shrink-0 rounded-full bg-promo px-2.5 py-0.5 text-xs font-extrabold text-white">−{deal.percentOff}%</span>
      </div>
      <p className="relative mt-1 text-xs font-medium text-white/75">
        {urgent ? "Segera berakhir! Harga promo tinggal:" : "Harga promo berakhir dalam:"}
      </p>
      <div role="timer" aria-label={`Promo berakhir ${formatDateTime(new Date(deal.endsAt))} WIB`} className="relative mt-3 flex items-start justify-between gap-1.5 sm:gap-2">
        {units.map((u, i) => (
          <div key={u.l} className="flex flex-1 items-start gap-1.5 sm:gap-2">
            <div className={`flex-1 rounded-xl bg-gradient-to-b px-1 py-2 text-center shadow-[inset_0_-3px_0_rgb(0_0_0/0.08)] ring-1 ${tile}`}>
              <span className="block font-display text-[1.75rem] leading-none font-bold tabular-nums sm:text-4xl" aria-hidden="true">
                {u.v == null ? "--" : pad(u.v)}
              </span>
              <span className="mt-1 block text-[10px] font-bold tracking-wider uppercase opacity-60 sm:text-[11px]">{u.l}</span>
            </div>
            {i < units.length - 1 && (
              <span aria-hidden="true" className="pt-2 font-display text-2xl font-bold text-gold-400/80 sm:pt-2.5 sm:text-3xl">
                :
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="relative mt-3 text-[11px] text-white/55">Berlaku s.d. {formatDateTime(new Date(deal.endsAt))} WIB</p>
    </div>
  );
}

/* ───────────── Bilah mobile ───────────── */

/** Harga ringkas untuk bilah CTA mobile. */
export function MobilePromoPrice({ promo }: { promo: LandingPromo | null }) {
  const { deal } = useDeal(promo);
  if (!deal) {
    return (
      <p className="mb-2 flex items-baseline justify-center gap-2 leading-none">
        <span className="gold-text font-display text-xl font-bold">{promo ? formatRupiah(promo.basePrice) : staticPrice}</span>
        <span className="text-xs text-white/60">{priceNote}</span>
      </p>
    );
  }
  return (
    <p className="mb-2 flex items-baseline justify-center gap-2 leading-none">
      <s className="text-sm text-white/50 decoration-promo">{formatRupiah(deal.basePrice)}</s>
      <span className="gold-text font-display text-xl font-bold">{formatRupiah(deal.price)}</span>
      <span className="text-xs whitespace-nowrap text-white/60">
        <span className="min-[370px]:hidden">+ ongkir</span>
        <span className="hidden min-[370px]:inline">{priceNote}</span>
      </span>
    </p>
  );
}

/** Strip hitung mundur di atas bilah CTA mobile. Menandai <html data-promo> agar tombol WhatsApp naik. */
export function MobilePromoStrip({ promo }: { promo: LandingPromo | null }) {
  const { deal, now } = useDeal(promo);
  const show = !!deal && deal.endsAt != null;
  useEffect(() => {
    document.documentElement.toggleAttribute("data-promo", show);
    return () => document.documentElement.removeAttribute("data-promo");
  }, [show]);
  if (!deal || deal.endsAt == null) return null;
  const left = now == null ? null : splitRemaining(deal.endsAt - now);
  const urgent = now != null && deal.endsAt - now < 3600_000;
  const time = left == null ? "--:--:--" : `${left.days > 0 ? `${left.days} hari ` : ""}${pad(left.hours)}:${pad(left.minutes)}:${pad(left.seconds)}`;
  return (
    <p
      role="timer"
      aria-label={`Promo ${deal.name} berakhir ${formatDateTime(new Date(deal.endsAt))} WIB`}
      className={`-mx-4 -mt-3 mb-2.5 flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white ${urgent ? "bg-promo" : "bg-gradient-to-r from-promo-dark via-promo to-promo-dark"}`}
    >
      <FlameIcon className={`size-3.5 ${urgent ? "animate-pulse" : ""}`} />
      <span className="whitespace-nowrap">
        Hemat {deal.percentOff}%<span className="hidden min-[360px]:inline"> · berakhir dalam</span>
      </span>
      <span className="rounded bg-black/25 px-1.5 py-0.5 font-display text-sm whitespace-nowrap tabular-nums" aria-hidden="true">
        {time}
      </span>
    </p>
  );
}
