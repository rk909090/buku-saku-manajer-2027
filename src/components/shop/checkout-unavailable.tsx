"use client";

import { MessageCircle, ShoppingBag, Store } from "lucide-react";
import { HomeLink } from "@/components/shop/home-link";
import { LEGACY_MARKETPLACES, WHATSAPP_URL } from "@/lib/content";
import { gaEvent } from "@/lib/ga";

/**
 * Ditampilkan kepada pembeli bila checkout situs belum siap (kunci API / lokasi asal / berat produk
 * belum diisi, atau database tidak terjangkau). Alasan teknisnya tidak ditampilkan ke pembeli —
 * admin melihatnya di dashboard (/admin → daftar persiapan). Pembeli tetap bisa membeli lewat
 * toko resmi di marketplace atau WhatsApp, sehingga penjualan tidak terhenti selama persiapan.
 */
/** `whatsappUrl` dari pengaturan admin (lewat API katalog); bila katalog gagal dimuat, pakai nomor cadangan. */
export function CheckoutUnavailable({ whatsappUrl = WHATSAPP_URL }: { whatsappUrl?: string }) {
  const track = (marketplace: string) => gaEvent("marketplace_click", { marketplace, cta_placement: "checkout_fallback" });
  const btn = "flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold-300/25">
        <ShoppingBag className="size-7 text-gold-700" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold text-navy-900 sm:text-3xl">Pemesanan online sedang disiapkan</h1>
      <p className="mt-3 text-muted">
        Untuk sementara, Buku Saku Manajer tetap bisa Anda beli di toko resmi kami berikut ini.
      </p>
      <div className="mt-8 space-y-3">
        <a href={LEGACY_MARKETPLACES.shopee} target="_blank" rel="noopener" onClick={() => track("shopee")} className={`${btn} bg-shopee-dark text-white hover:brightness-95 focus-visible:outline-shopee-dark`}>
          <Store className="size-5" /> Beli di Shopee
        </a>
        <a href={LEGACY_MARKETPLACES.tokopedia} target="_blank" rel="noopener" onClick={() => track("tokopedia")} className={`${btn} bg-tokopedia-dark text-white hover:brightness-95 focus-visible:outline-tokopedia-dark`}>
          <Store className="size-5" /> Beli di Tokopedia
        </a>
        <a href={whatsappUrl} target="_blank" rel="noopener" onClick={() => track("whatsapp")} className={`${btn} border border-navy-900/15 bg-white text-navy-900 hover:bg-navy-900/5 focus-visible:outline-navy-900`}>
          <MessageCircle className="size-5" /> Tanya via WhatsApp
        </a>
      </div>
      <HomeLink className="mt-8 inline-block text-sm font-semibold text-navy-800 underline-offset-4 hover:underline">
        Kembali ke halaman buku
      </HomeLink>
    </div>
  );
}
