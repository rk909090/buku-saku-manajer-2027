"use client";

import { useEffect, useState } from "react";
import { AB_EXPERIMENT, AB_QUERY_PARAM, type AbVariantId } from "@/lib/ab-config";
import { GA_CTA_EVENT, GA_VIEW_EVENT } from "@/lib/analytics";
import { BOOK_ITEM, gaEvent } from "@/lib/ga";
import { price } from "@/lib/content";

const BOOK_PRICE = Number(price.replace(/\D/g, ""));

/**
 * Semua event A/B lewat fungsi `trackAbEvent`, yang:
 *   1. mengirim event ke /api/ab → tabel MySQL `ab_events`,
 *   2. untuk klik tombol beli: gtag('event', 'add_to_cart', …) → GA4 (e-commerce),
 *   3. push objek event ke window.dataLayer (untuk GTM bila nanti dipakai), dan
 *   4. menyimpan salinan di window.__abEvents untuk pengecekan manual.
 */
export type AbEvent = {
  event: "ab_headline_view" | "ab_cta_click";
  experiment: string;
  variant: AbVariantId;
  placement?: string;
  marketplace?: string;
  forced?: boolean;
  ts: number;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    /** Didefinisikan oleh snippet Google tag di src/app/layout.tsx. */
    gtag?: (...args: unknown[]) => void;
    __abEvents?: AbEvent[];
  }
}

export function trackAbEvent(e: AbEvent) {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(e);
  window.__abEvents = window.__abEvents ?? [];
  window.__abEvents.push(e);
  if (process.env.NODE_ENV !== "production") console.info("[A/B]", e.event, e);

  // GA4: tayangan headline → headline_view; klik tombol beli → add_to_cart.
  if (e.event === "ab_headline_view") {
    window.gtag?.("event", GA_VIEW_EVENT, {
      headline_variant: e.variant,
      ab_experiment: e.experiment,
    });
  }
  if (e.event === "ab_cta_click") {
    // Tombol "Beli Sekarang" menambahkan buku ke keranjang → event e-commerce standar GA4.
    gaEvent(GA_CTA_EVENT, {
      value: BOOK_PRICE,
      items: [BOOK_ITEM(BOOK_PRICE, 1)],
      cta_placement: e.placement,
      headline_variant: e.variant,
      ab_experiment: e.experiment,
    });
  }

  // Kirim ke /api/ab (disimpan ke MySQL). sendBeacon tetap terkirim walau halaman ditutup.
  const payload = JSON.stringify(e);
  try {
    const sent = navigator.sendBeacon?.("/api/ab", new Blob([payload], { type: "application/json" }));
    if (!sent) {
      void fetch("/api/ab", {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Pencatatan tidak boleh mengganggu pengunjung.
  }
}

/**
 * Mencatat tayangan headline sekali per pemuatan halaman, dan setiap klik
 * tombol CTA (elemen bertanda data-cta) beserta posisinya dan marketplace-nya (data-mp).
 * Saat varian dipaksa lewat ?hl=, event ditandai `forced: true` (untuk QA,
 * nantinya dikecualikan dari hasil) dan muncul label kecil penanda varian.
 */
export function AbTracker({ variant }: { variant: AbVariantId }) {
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const isForced = new URLSearchParams(window.location.search).has(AB_QUERY_PARAM);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- baca URL hanya bisa di klien
    setForced(isForced);
    const base = { experiment: AB_EXPERIMENT, variant, forced: isForced };

    trackAbEvent({ ...base, event: "ab_headline_view", ts: Date.now() });

    function onClick(ev: MouseEvent) {
      const el = (ev.target as Element | null)?.closest<HTMLElement>("[data-cta]");
      if (!el) return;
      trackAbEvent({
        ...base,
        event: "ab_cta_click",
        placement: el.dataset.cta,
        marketplace: el.dataset.mp,
        ts: Date.now(),
      });
    }
    // "auxclick" menangkap klik tengah (buka di tab baru)
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("auxclick", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("auxclick", onClick, { capture: true });
    };
  }, [variant]);

  if (!forced) return null;
  return (
    <div className="fixed top-20 left-4 z-50 rounded-full bg-black/80 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
      A/B pratinjau · Varian {variant.toUpperCase()}
    </div>
  );
}
