/**
 * Perhitungan harga murni (tanpa DB) — dipakai server; bebas dependensi agar mudah diuji.
 */

export function discountAmount(price: number, d: { type: "percent" | "fixed"; value: number }) {
  if (d.type === "percent") return Math.floor((price * Math.min(d.value, 100)) / 100);
  return Math.min(d.value, price);
}

/**
 * Jaga total ≥ minimal pembayaran: kurangi potongan ongkir dulu, lalu potongan kupon.
 * `belowMinimum` = total tetap di bawah minimal (mis. tanpa kupon pun di bawah minimal) — pesanan ditolak.
 */
export function applyMinimumTotal(p: { subtotal: number; couponDiscount: number; shipping: number; shippingDiscount: number; min: number }) {
  let { couponDiscount, shippingDiscount } = p;
  let total = p.subtotal - couponDiscount + p.shipping - shippingDiscount;
  let limited = false;
  if (total < p.min) {
    let deficit = p.min - total;
    const fromShip = Math.min(shippingDiscount, deficit);
    shippingDiscount -= fromShip;
    deficit -= fromShip;
    const fromCoupon = Math.min(couponDiscount, deficit);
    couponDiscount -= fromCoupon;
    limited = fromShip + fromCoupon > 0;
    total = p.subtotal - couponDiscount + p.shipping - shippingDiscount;
  }
  return { couponDiscount, shippingDiscount, total, limited, belowMinimum: total < p.min };
}

/** Bagi potongan kupon ke baris produk secara proporsional; sisa pembulatan ke pecahan terbesar. */
export function allocate(lineTotals: number[], amount: number): number[] {
  const sum = lineTotals.reduce((a, b) => a + b, 0);
  if (!amount || !sum) return lineTotals.map(() => 0);
  const raw = lineTotals.map((t) => (t * amount) / sum);
  const out = raw.map((r) => Math.floor(r));
  let rest = amount - out.reduce((a, b) => a + b, 0);
  const byFraction = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of byFraction) {
    if (rest <= 0) break;
    if (out[i] < lineTotals[i]) {
      out[i]++;
      rest--;
    }
  }
  return out;
}

/** Item untuk Xendit: potongan masuk ke harga item sehingga jumlah item = total (Xendit tidak punya tipe item diskon). */
export function paymentLines(
  lines: { lineTotal: number; qty: number }[],
  couponDiscount: number
): { amount: number; unit: number; quantity: number; split: boolean; couponCut: number }[] {
  const alloc = allocate(
    lines.map((l) => l.lineTotal),
    couponDiscount
  );
  return lines.map((l, k) => {
    const amount = l.lineTotal - alloc[k];
    const even = amount % l.qty === 0;
    return { amount, unit: even ? amount / l.qty : amount, quantity: even ? l.qty : 1, split: !even, couponCut: alloc[k] };
  });
}
