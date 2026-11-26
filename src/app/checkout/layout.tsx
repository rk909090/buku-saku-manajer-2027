import type { Metadata } from "next";
import Image from "next/image";
import { Lock } from "lucide-react";
import logo from "../../../public/images/logo-hpi.png";
import { GoogleTag } from "@/components/google-tag";
import { JourneyTracker } from "@/components/journey-tracker";
import { HomeLink } from "@/components/shop/home-link";

export const metadata: Metadata = {
  title: "Checkout — Buku Saku Manajer",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function CheckoutLayout({ children }: LayoutProps<"/checkout">) {
  return (
    <div className="min-h-dvh bg-cream">
      <GoogleTag />
      <JourneyTracker />
      <header className="border-b border-navy-900/10 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <HomeLink className="block">
            <Image src={logo} alt="Human Plus Institute — kembali ke halaman buku" className="h-9 w-auto" preload />
          </HomeLink>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800">
            <Lock className="size-4 text-gold-700" /> Checkout aman
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
