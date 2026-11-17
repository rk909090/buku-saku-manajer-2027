"use client";

import { useSyncExternalStore } from "react";

/**
 * Keranjang di localStorage browser. Isinya hanya slug + jumlah; harga, stok, dan berat
 * selalu diambil ulang dari server saat checkout (tidak dipercaya dari browser).
 */
export type CartLine = { slug: string; qty: number };

const KEY = "bsm_cart_v1";
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;
const EMPTY: CartLine[] = [];

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    cache = Array.isArray(raw)
      ? raw.filter((l) => typeof l?.slug === "string" && Number.isInteger(l?.qty) && l.qty > 0).slice(0, 20)
      : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* mode privat / storage penuh: tetap jalan di memori */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

export const cart = {
  get: read,
  set: write,
  add(slug: string, qty = 1, max = 20) {
    const lines = [...read()];
    const i = lines.findIndex((l) => l.slug === slug);
    if (i >= 0) lines[i] = { slug, qty: Math.min(max, lines[i].qty + qty) };
    else lines.push({ slug, qty: Math.min(max, qty) });
    write(lines);
  },
  /** Pastikan produk ada di keranjang (dipakai tombol "Beli Sekarang": tidak menggandakan). */
  ensure(slug: string) {
    if (!read().some((l) => l.slug === slug)) cart.add(slug, 1);
  },
  setQty(slug: string, qty: number, max = 20) {
    const q = Math.max(0, Math.min(max, Math.floor(qty)));
    write(q === 0 ? read().filter((l) => l.slug !== slug) : read().map((l) => (l.slug === slug ? { slug, qty: q } : l)));
  },
  clear() {
    write([]);
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount(): number {
  return useCart().reduce((s, l) => s + l.qty, 0);
}
