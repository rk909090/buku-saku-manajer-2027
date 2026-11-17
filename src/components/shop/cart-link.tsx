"use client";

import { useCartCount } from "@/components/shop/cart-store";
import { CartIcon } from "@/components/ui";

/** Ikon keranjang di header dengan jumlah item. */
export function CartLink({ tone = "light" }: { tone?: "light" | "dark" }) {
  const count = useCartCount();
  return (
    <a
      href="/checkout"
      aria-label={count ? `Keranjang, ${count} item` : "Keranjang"}
      className={`relative grid size-10 place-items-center rounded-full transition ${
        tone === "dark" ? "text-white hover:bg-white/10" : "text-navy-900 hover:bg-navy-900/5"
      }`}
    >
      <CartIcon className="size-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-gold-500 px-1 text-[11px] leading-5 font-bold text-navy-950">
          {count}
        </span>
      )}
    </a>
  );
}
