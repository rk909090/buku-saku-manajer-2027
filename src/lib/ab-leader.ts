/**
 * Penentuan varian terbaik di dashboard A/B (murni, tanpa React — mudah diuji).
 * Ambang & uji statistik sama dengan src/lib/ab-stats.ts.
 */
export type AbVariantStat = { variant: string; visitors: number; clickers: number; conversion_rate: number };
export type AbOrders = { variant: string; revenue: number };

/** Uji dua proporsi — sama dengan src/lib/ab-stats.ts (ambang data: min. 100 pengunjung per varian & 20 klik). */
export function twoProp(a: AbVariantStat, b: AbVariantStat) {
  const enough = Math.min(a.visitors, b.visitors) >= 100 && a.clickers + b.clickers >= 20;
  if (!a.visitors || !b.visitors) return { enough: false, p: 1 };
  const p1 = a.clickers / a.visitors;
  const p2 = b.clickers / b.visitors;
  const pooled = (a.clickers + b.clickers) / (a.visitors + b.visitors);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / a.visitors + 1 / b.visitors));
  const z = se ? Math.abs(p2 - p1) / se : 0;
  return { enough, p: 2 * (1 - normalCdf(z)) };
}
function normalCdf(x: number) {
  const t = 1 / (1 + 0.3275911 * (x / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return 0.5 * (1 + y);
}

export type Leader = { id: string; final: boolean; note: string };

/**
 * Varian terbaik = konversi klik tertinggi (metrik utama tes ini); bila konversi seri, pendapatan lebih tinggi.
 * "Pemenang" (final) HANYA bila unggul signifikan (p < 0,05, data cukup) dibanding SETIAP varian lain;
 * selain itu "Unggul sementara". Tidak ada sorotan bila data kosong atau benar-benar seri.
 */
export function pickLeader(vs: AbVariantStat[], orders: AbOrders[]): Leader | null {
  const rev = (id: string) => orders.find((o) => o.variant === id)?.revenue ?? 0;
  const live = vs.filter((v) => v.visitors > 0);
  if (live.length < 2) return null;
  const sorted = [...live].sort((a, b) => b.conversion_rate - a.conversion_rate || rev(b.variant) - rev(a.variant));
  const [top, second] = sorted;
  if (top.conversion_rate === second.conversion_rate && rev(top.variant) === rev(second.variant)) return null;
  const others = vs.filter((v) => v.variant !== top.variant);
  const tests = others.map((o) => twoProp(o, top));
  const final = others.every((o, i) => tests[i].enough && tests[i].p < 0.05 && top.conversion_rate > o.conversion_rate);
  const enoughAll = tests.every((t) => t.enough);
  return {
    id: top.variant,
    final,
    note: final
      ? "Unggul signifikan secara statistik (p < 0,05) dibanding semua varian lain."
      : !enoughAll
        ? "Belum final: data belum cukup (min. 100 pengunjung per varian & 20 klik), urutan masih bisa berubah."
        : "Belum final: selisih dengan varian lain belum signifikan secara statistik.",
  };
}

