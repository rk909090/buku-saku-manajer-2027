"use client";

/**
 * Event e-commerce GA4 (nama & parameter standar Google):
 *   add_to_cart → begin_checkout → add_shipping_info → add_payment_info → purchase
 * `purchase` adalah key event bawaan GA4. Tidak ada data pribadi (nama/email/HP) yang dikirim.
 */
export type GaItem = { item_id: string; item_name: string; price: number; quantity: number };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function gaEvent(name: string, params: Record<string, unknown>) {
  try {
    window.gtag?.("event", name, { currency: "IDR", ...params });
  } catch {
    /* pelacakan tidak boleh mengganggu pembeli */
  }
}

export const BOOK_ITEM = (price: number, quantity = 1): GaItem => ({
  item_id: "buku-saku-manajer",
  item_name: "Buku Saku Manajer — Edisi Kedua",
  price,
  quantity,
});
