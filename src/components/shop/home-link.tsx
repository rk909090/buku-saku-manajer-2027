import type { ReactNode } from "react";

/**
 * Link ke halaman utama dengan muat-ulang penuh (bukan navigasi client), supaya proxy A/B
 * menentukan varian dan Google tag mencatat page_view seperti kunjungan biasa.
 */
export function HomeLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- sengaja full reload (lihat komentar di atas)
    <a href="/" className={className}>
      {children}
    </a>
  );
}
