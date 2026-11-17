import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Dashboard — Buku Saku Manajer", template: "%s — Dashboard BSM" },
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
