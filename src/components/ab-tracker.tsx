"use client";

import { useEffect, useState } from "react";
import { AB_EXPERIMENT, AB_QUERY_PARAM, type AbVariantId } from "@/lib/ab-config";

/**
 * Semua event A/B lewat fungsi `trackAbEvent`, yang:
 *   1. mengirim event ke /api/ab → tabel MySQL `ab_events`,
 *   2. push ke window.dataLayer (otomatis terbaca bila nanti dipasang GTM/GA4), dan
 *   3. menyimpan salinan di window.__abEvents untuk pengecekan manual.
 */
export type AbEvent = {
  event: "ab_headline_view" | "ab_cta_click";
  experiment: string;
  variant: AbVariantId;
  placement?: string;
  forced?: boolean;
  ts: number;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    __abEvents?: AbEvent[];
  }
}

export function trackAbEvent(e: AbEvent) {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(e);
  window.__abEvents = window.__abEvents ?? [];
  window.__abEvents.push(e);
  if (process.env.NODE_ENV !== "production") console.info("[A/B]", e.event, e);

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
 * tombol CTA (elemen bertanda data-cta) beserta posisinya.
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
      trackAbEvent({ ...base, event: "ab_cta_click", placement: el.dataset.cta, ts: Date.now() });
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
