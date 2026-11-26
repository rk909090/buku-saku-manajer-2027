"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isDirect, mergeAttribution, sanitizeTouch, touchFromLocation, type Attribution, type Touch } from "@/lib/attribution";
import { SESSION_TIMEOUT_MS, type JourneyEvent } from "@/lib/journey-config";

/**
 * Pelacak perjalanan pengunjung (first-party, anonim) → /api/journey.
 * - Menyimpan atribusi (UTM/click ID/perujuk) pertama & terakhir di localStorage untuk dilampirkan ke pesanan.
 * - Mengelola ID sesi (baru setelah 30 menit tidak aktif atau datang dari kampanye/perujuk berbeda).
 * - Mencatat: kedatangan, halaman, seksi landing yang terlihat, kedalaman gulir, klik beli, WhatsApp, FAQ,
 *   dan waktu aktif saat meninggalkan halaman. Event checkout dicatat lewat trackJourney().
 * Tidak mengirim data pribadi; semua dibungkus try/catch agar tidak pernah mengganggu pengunjung.
 */

const ATTR_KEY = "bsm_attr_v1";
const SESS_KEY = "bsm_sess_v1";
type StoredSession = { id: string; last: number; sig: string | null };
type Ctx = { sid: string; path: string; ab: string | null; forced: boolean };

let ctx: Ctx | null = null;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* penyimpanan diblokir (mode privat dsb.) — abaikan */
  }
}
function uuid() {
  try {
    return crypto.randomUUID();
  } catch {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
}
const touchSig = (t: Touch) => (isDirect(t) ? null : [t.source, t.medium, t.campaign, t.clickIdType, t.referrerHost].join("|"));

function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    const ok = navigator.sendBeacon?.("/api/journey", new Blob([body], { type: "application/json" }));
    if (!ok) void fetch("/api/journey", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    /* pencatatan tidak boleh mengganggu pengunjung */
  }
}

function touchSession() {
  if (!ctx) return;
  const s = read<StoredSession>(SESS_KEY);
  if (s && s.id === ctx.sid) write(SESS_KEY, { ...s, last: Date.now() });
}

/** Catat satu langkah perjalanan (mis. dari halaman checkout). Aman dipanggil kapan saja. */
export function trackJourney(event: JourneyEvent, detail?: string | null, value?: number | null) {
  if (!ctx) return;
  touchSession();
  send({ sid: ctx.sid, e: event, p: ctx.path, d: detail ?? undefined, v: value ?? undefined, ab: ctx.ab ?? undefined, f: ctx.forced || undefined });
}

/** Atribusi untuk dilampirkan ke pesanan (dibaca dari localStorage). */
export function getOrderAttribution(): { sessionId: string | null; first: Touch | null; last: Touch | null } {
  const a = read<Attribution>(ATTR_KEY);
  return { sessionId: ctx?.sid ?? read<StoredSession>(SESS_KEY)?.id ?? null, first: sanitizeTouch(a?.first), last: sanitizeTouch(a?.last) };
}

const toJourneyPath = (p: string) => (p.startsWith("/checkout/status") ? "/checkout/status" : p.startsWith("/checkout") ? "/checkout" : "/");

export function JourneyTracker({ abVariant = null }: { abVariant?: string | null }) {
  const pathname = usePathname();

  useEffect(() => {
    let cleanup = () => {};
    try {
      const path = toJourneyPath(pathname || location.pathname);
      const forced = new URLSearchParams(location.search).has("hl");
      const touch = touchFromLocation(location.href, document.referrer, location.host);
      write(ATTR_KEY, mergeAttribution(read<Attribution>(ATTR_KEY), touch));

      // Sesi: lanjut bila masih aktif (<30 menit) dan tidak datang dari kampanye/perujuk lain.
      const now = Date.now();
      const prev = read<StoredSession>(SESS_KEY);
      const sig = touchSig(touch);
      const resume = !!prev && typeof prev.id === "string" && now - prev.last < SESSION_TIMEOUT_MS && (!sig || sig === prev.sig);
      const sid = resume ? prev!.id : uuid();
      write(SESS_KEY, { id: sid, last: now, sig: resume ? prev!.sig : sig });
      ctx = { sid, path, ab: abVariant, forced };

      if (!resume) send({ sid, e: "session_start", p: path, t: touch, ab: abVariant ?? undefined, f: forced || undefined });
      trackJourney("page_view");

      /* ── Klik: tombol beli, WhatsApp, FAQ ── */
      const onClick = (ev: MouseEvent) => {
        const el = ev.target as Element | null;
        const cta = el?.closest<HTMLElement>("[data-cta]");
        if (cta) trackJourney("cta_click", (cta.dataset.cta || "").toLowerCase().slice(0, 40) || null);
        const a = el?.closest<HTMLAnchorElement>("a[href]");
        if (a && /(^|\/\/)(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//.test(a.href)) trackJourney("whatsapp_click", path === "/" ? "landing" : "checkout");
        const summary = el?.closest("summary");
        const details = summary?.parentElement;
        if (summary && details instanceof HTMLDetailsElement && !details.open && details.closest('[data-section="faq"]')) {
          const all = [...document.querySelectorAll('[data-section="faq"] details')];
          trackJourney("faq_open", `q${all.indexOf(details) + 1}`);
        }
      };
      document.addEventListener("click", onClick, { capture: true });

      /* ── Seksi landing yang terlihat (sekali per seksi per halaman) ── */
      const seen = new Set<string>();
      let io: IntersectionObserver | null = null;
      if (path === "/" && "IntersectionObserver" in window) {
        io = new IntersectionObserver(
          (entries) => {
            for (const en of entries) {
              const id = (en.target as HTMLElement).dataset.section;
              if (en.isIntersecting && id && !seen.has(id)) {
                seen.add(id);
                trackJourney("section_view", id);
              }
            }
          },
          // "Garis baca": seksi dihitung terlihat saat melewati pita 20% di tengah layar. Ambang rasio area
          // (mis. 35%) tidak bisa dipakai — seksi yang lebih tinggi dari ±3× layar tidak pernah mencapainya.
          { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
        );
        document.querySelectorAll<HTMLElement>("[data-section]").forEach((s) => io!.observe(s));
      }

      /* ── Kedalaman gulir (landing) ── */
      const marks = [25, 50, 75, 100];
      const hit = new Set<number>();
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          const h = document.documentElement.scrollHeight - window.innerHeight;
          const pct = h > 0 ? ((window.scrollY + 1) / h) * 100 : 100;
          for (const m of marks) if (pct >= m - 2 && !hit.has(m)) {
            hit.add(m);
            trackJourney("scroll", null, m);
          }
        });
      };
      if (path === "/") window.addEventListener("scroll", onScroll, { passive: true });

      /* ── Waktu aktif: dihitung hanya saat tab terlihat; dilaporkan saat disembunyikan/ditutup ── */
      let visibleSince = document.visibilityState === "visible" ? performance.now() : null;
      let pending = 0;
      const flush = () => {
        if (visibleSince != null) {
          pending += performance.now() - visibleSince;
          visibleSince = null;
        }
        const secs = Math.round(pending / 1000);
        if (secs >= 1) {
          pending = 0;
          trackJourney("page_leave", null, secs);
        }
      };
      const onVisibility = () => {
        if (document.visibilityState === "hidden") flush();
        else visibleSince = performance.now();
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pagehide", flush);

      cleanup = () => {
        flush();
        document.removeEventListener("click", onClick, { capture: true });
        io?.disconnect();
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pagehide", flush);
      };
    } catch {
      /* jangan pernah mengganggu halaman */
    }
    return () => cleanup();
  }, [pathname, abVariant]);

  return null;
}
