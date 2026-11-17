import type { ReactNode } from "react";
import { ORDER_URL, cta, price } from "@/lib/content";

/** Merender penanda emphasis sederhana dari content.ts (**bold**, _italic_, _**keduanya**_). */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(_\*\*[^*]+\*\*_|\*\*[^*]+\*\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("_**") && p.endsWith("**_")) {
          return (
            <em key={i}>
              <strong className="font-bold text-current">{p.slice(3, -3)}</strong>
            </em>
          );
        }
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-bold">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.length > 2 && p.startsWith("_") && p.endsWith("_")) {
          return <em key={i}>{p.slice(1, -1)}</em>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

/** Tombol CTA bermerek Shopee: warna oranye Shopee + ikon tas belanja. Membuka Shopee di tab baru. */
export function CtaButton({
  label = cta.main,
  size = "lg",
  className = "",
  placement,
}: {
  label?: string;
  size?: "sm" | "lg";
  className?: string;
  /** Posisi tombol di halaman, dicatat oleh A/B tracker (atribut data-cta). */
  placement: string;
}) {
  const sizes = size === "sm" ? "gap-1.5 px-4 py-2.5 text-sm" : "gap-2.5 px-7 py-4 text-lg sm:text-xl";
  return (
    <a
      href={ORDER_URL}
      data-cta={placement}
      target="_blank"
      rel="noopener noreferrer"
      className={`cta-shine group inline-flex items-center justify-center rounded-full bg-gradient-to-b from-shopee to-shopee-dark text-center font-display font-semibold tracking-wide text-white shadow-[0_10px_30px_-8px_rgb(238_77_45/0.65)] ring-1 ring-white/25 transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-shopee active:translate-y-0 ${sizes} ${className}`}
    >
      <ShopeeBagIcon className={size === "sm" ? "size-5" : "size-6"} />
      {label}
      <ArrowIcon className={size === "sm" ? "size-4" : "size-5"} />
    </a>
  );
}

export function PriceTag({ tone = "dark", center = false }: { tone?: "dark" | "light"; center?: boolean }) {
  const amount = tone === "dark" ? "gold-text" : "text-navy-900";
  const note = tone === "dark" ? "text-white/70" : "text-muted";
  return (
    <p className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${center ? "justify-center" : ""}`}>
      <span className={`font-display text-4xl font-bold tracking-tight sm:text-5xl ${amount}`}>{price}</span>
      <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${note}`}>
        <ShopeeBagIcon className="size-4 text-shopee" />
        Harga di Shopee
      </span>
    </p>
  );
}

/**
 * Ikon tas belanja bergaya Shopee (digambar sederhana, bukan file logo resmi).
 * Tas mengikuti `currentColor`; huruf S berwarna oranye Shopee.
 */
export function ShopeeBagIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M8.5 7.5V6.6a3.5 3.5 0 0 1 7 0v.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path fill="currentColor" d="M4.6 7.5h14.8l-1.05 13a1.9 1.9 0 0 1-1.9 1.75H7.55a1.9 1.9 0 0 1-1.9-1.75L4.6 7.5Z" />
      <text x="12" y="19.2" textAnchor="middle" fontSize="10.5" fontWeight="800" fontFamily="Arial, sans-serif" fill="#EE4D2D">
        S
      </text>
    </svg>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={`transition group-hover:translate-x-0.5 ${className}`}>
      <path
        fillRule="evenodd"
        d="M3 10a.75.75 0 0 1 .75-.75h10.64l-3.72-3.72a.75.75 0 1 1 1.06-1.06l5 5a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 1 1-1.06-1.06l3.72-3.72H3.75A.75.75 0 0 1 3 10Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9L10 1.5Z" />
    </svg>
  );
}

export function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" strokeLinecap="round" />
    </svg>
  );
}

export function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.97 1-3.62-.24-.37a9.8 9.8 0 0 1-1.5-5.22c0-5.42 4.42-9.83 9.84-9.83 2.63 0 5.1 1.03 6.95 2.88a9.77 9.77 0 0 1 2.88 6.96c0 5.42-4.42 9.83-9.84 9.83Zm8.38-18.2A11.76 11.76 0 0 0 12.05.15C5.5.15.17 5.48.17 12.03c0 2.1.55 4.14 1.59 5.94L.07 24.13l6.3-1.65a11.86 11.86 0 0 0 5.68 1.45h.01c6.54 0 11.87-5.33 11.88-11.88 0-3.17-1.24-6.16-3.5-8.4Z" />
    </svg>
  );
}
