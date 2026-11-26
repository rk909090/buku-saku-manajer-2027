/**
 * Rekomendasi aksi dari data perjalanan pengunjung — aturan eksplisit (bukan AI), murni & bisa diuji.
 * Setiap rekomendasi menyertakan angka buktinya dan tingkat keyakinan berdasarkan jumlah sampel,
 * supaya tim tidak mengambil keputusan besar dari data yang masih sedikit.
 */

export type Agg = {
  sessions: number;
  engaged: number;
  intent: number; // klik beli atau membuka checkout
  checkout: number; // begin_checkout
  shipping: number;
  pay: number;
  orders: number;
  paid: number;
  revenue: number;
};
export type Segment = Agg & { key: string; label: string };

export type InsightInput = {
  days: number;
  totals: Agg & { avgEngaged: number; medianEngaged: number; preview: number; previewIntent: number; whatsapp: number };
  channels: Segment[];
  campaigns: Segment[];
  devices: Segment[];
  exits: { id: string; label: string; n: number }[];
  landingNoIntent: number; // sesi landing tanpa klik beli (penyebut exits)
  clickIdWithoutUtm: number; // sesi dengan gclid/fbclid/ttclid tapi tanpa utm_campaign
  paidChannelSessions: number; // sesi dari kanal iklan
  pendingNow: { count: number; value: number };
  ordersUnattributed: number; // pesanan pada periode ini tanpa data atribusi
  ordersTotal: number;
};

export type Insight = {
  id: string;
  priority: 1 | 2 | 3; // 1 = paling mendesak
  tone: "red" | "amber" | "blue" | "green";
  title: string;
  evidence: string;
  actions: string[];
  /** "cukup" = sampel memadai; "indikasi" = arah awal, perlu dikonfirmasi data lebih banyak. */
  confidence: "cukup" | "indikasi";
  link?: { href: string; label: string };
};

export const MIN_SEGMENT = 30; // sesi minimum agar segmen dibandingkan
export const MIN_STEP = 20; // sesi minimum di langkah sebelumnya agar drop-off dinilai
const pct = (n: number, d: number) => (d > 0 ? n / d : 0);
const fmtPct = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")}%`;
const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

/** Saran per langkah funnel tempat pengunjung paling banyak berhenti. */
const STEP_ADVICE: Record<string, { title: string; actions: string[] }> = {
  engaged: {
    title: "Banyak pengunjung pergi sebelum benar-benar membaca halaman",
    actions: [
      "Pastikan pesan iklan sama dengan headline di halaman (janji iklan = isi hero).",
      "Periksa kecepatan halaman di ponsel (PageSpeed Insights) — pengunjung iklan sering pergi bila lambat.",
      "Tampilkan manfaat utama & foto buku di layar pertama, tanpa perlu menggulir.",
    ],
  },
  intent: {
    title: "Pengunjung membaca, tetapi sedikit yang menekan tombol beli",
    actions: [
      "Perkuat penawaran: tonjolkan harga promo, batas waktu, dan manfaat konkret dekat tombol beli.",
      "Dekatkan testimoni/bukti sosial ke area harga.",
      "Uji headline/varian lain lewat A/B test yang sudah berjalan.",
    ],
  },
  checkout: {
    title: "Klik beli tidak berlanjut ke halaman checkout",
    actions: ["Cek tombol beli di semua posisi & perangkat — kemungkinan masalah teknis (tautan/keranjang)."],
  },
  shipping: {
    title: "Pembeli berhenti di formulir checkout sebelum memilih kurir",
    actions: [
      "Sederhanakan formulir: isian sedikit, contoh pengisian jelas, simpan isian bila pembeli kembali (sudah ada).",
      "Tampilkan perkiraan ongkir lebih awal atau tawarkan gratis/potongan ongkir.",
      "Sediakan tombol tanya WhatsApp di checkout untuk yang ragu.",
    ],
  },
  pay: {
    title: "Pembeli berhenti setelah melihat total + ongkir",
    actions: [
      "Ongkir mungkin terasa mahal — uji kupon gratis/potongan ongkir.",
      "Tampilkan jaminan & cara bayar (VA bank) lebih jelas sebelum tombol Bayar.",
    ],
  },
  orders: {
    title: "Klik bayar tidak menghasilkan pesanan",
    actions: ["Kemungkinan masalah teknis pembayaran — periksa riwayat pesanan (status dibatalkan/gagal) & log Xendit."],
  },
  paid: {
    title: "Banyak pesanan dibuat tetapi tidak dibayar",
    actions: [
      "Hubungi pembeli dengan pesanan 'Menunggu pembayaran' lewat WhatsApp (nomor ada di detail pesanan).",
      "Pastikan email pengingat pembayaran terkirim & mudah dipahami (lihat pratinjau email).",
      "Pertimbangkan metode bayar tambahan bila pembeli kesulitan dengan Virtual Account.",
    ],
  },
};

export const FUNNEL_STEPS: { key: keyof Agg; label: string }[] = [
  { key: "sessions", label: "Sesi" },
  { key: "engaged", label: "Terlibat" },
  { key: "intent", label: "Tertarik beli" },
  { key: "checkout", label: "Mulai checkout" },
  { key: "shipping", label: "Pilih kurir" },
  { key: "pay", label: "Klik bayar" },
  { key: "orders", label: "Pesanan dibuat" },
  { key: "paid", label: "Dibayar" },
];

export function buildInsights(d: InsightInput): Insight[] {
  const out: Insight[] = [];
  const t = d.totals;

  // 0) Volume data
  if (t.sessions < 100) {
    out.push({
      id: "volume",
      priority: 3,
      tone: "blue",
      title: "Data masih sedikit — perlakukan rekomendasi sebagai indikasi awal",
      evidence: `${t.sessions} sesi dalam ${d.days} hari terakhir. Perbandingan antarsegmen baru dinilai bila tiap segmen ≥ ${MIN_SEGMENT} sesi.`,
      actions: ["Lanjutkan iklan/promosi untuk menambah data sebelum mengambil keputusan besar (mis. mematikan kampanye)."],
      confidence: "indikasi",
    });
  }

  // 1) Pesanan menunggu pembayaran — aksi langsung, tidak butuh sampel besar
  if (d.pendingNow.count > 0) {
    out.push({
      id: "pending",
      priority: 1,
      tone: "red",
      title: `${d.pendingNow.count} pesanan menunggu pembayaran (${rp(d.pendingNow.value)})`,
      evidence: "Pesanan sudah dibuat tetapi belum dibayar dan belum kedaluwarsa.",
      actions: ["Follow-up hari ini lewat WhatsApp: ingatkan batas bayar & bantu bila kesulitan membayar."],
      confidence: "cukup",
      link: { href: "/admin/orders?status=pending_payment", label: "Lihat pesanan menunggu pembayaran" },
    });
  }

  // 2) Langkah funnel dengan kehilangan terbesar (relatif), hanya bila langkah sebelumnya cukup besar
  let worst: { key: string; from: string; prev: number; next: number; rate: number } | null = null;
  for (let i = 1; i < FUNNEL_STEPS.length; i++) {
    const a = FUNNEL_STEPS[i - 1];
    const b = FUNNEL_STEPS[i];
    const prev = t[a.key];
    const next = t[b.key];
    if (prev < MIN_STEP) continue;
    const rate = pct(next, prev);
    if (!worst || rate < worst.rate) worst = { key: b.key, from: a.label, prev, next, rate };
  }
  if (worst && worst.rate < 0.6 && STEP_ADVICE[worst.key]) {
    const step = FUNNEL_STEPS.find((s) => s.key === worst!.key)!;
    out.push({
      id: `funnel-${worst.key}`,
      priority: 1,
      tone: "amber",
      title: STEP_ADVICE[worst.key].title,
      evidence: `Hanya ${fmtPct(worst.rate)} sesi lanjut dari "${worst.from}" (${worst.prev}) ke "${step.label}" (${worst.next}) — penurunan terbesar di funnel.`,
      actions: STEP_ADVICE[worst.key].actions,
      confidence: worst.prev >= 100 ? "cukup" : "indikasi",
    });
  }

  // 3) Seksi tempat pengunjung (yang tidak klik beli) paling sering berhenti
  const exit = [...d.exits].sort((a, b) => b.n - a.n)[0];
  if (exit && d.landingNoIntent >= MIN_STEP && pct(exit.n, d.landingNoIntent) >= 0.3) {
    out.push({
      id: "exit-section",
      priority: 2,
      tone: "amber",
      title: `Banyak pengunjung berhenti di seksi "${exit.label}"`,
      evidence: `${fmtPct(pct(exit.n, d.landingNoIntent))} pengunjung landing yang tidak klik beli terakhir terlihat di seksi ini (${exit.n} dari ${d.landingNoIntent}).`,
      actions: [
        "Tambahkan tombol beli/ringkasan harga tepat di atau setelah seksi ini.",
        "Perpendek/perjelas seksi ini; pindahkan bagian terkuat (testimoni, intip isi) lebih ke atas.",
      ],
      confidence: d.landingNoIntent >= 100 ? "cukup" : "indikasi",
    });
  }

  // 4) Kanal: terbaik & terlemah (minat beli per sesi), hanya segmen dengan sampel cukup
  const overallIntent = pct(t.intent, t.sessions);
  const bigChannels = d.channels.filter((c) => c.sessions >= MIN_SEGMENT);
  if (bigChannels.length >= 2) {
    const sorted = [...bigChannels].sort((a, b) => pct(b.intent, b.sessions) - pct(a.intent, a.sessions));
    const best = sorted[0];
    const worstC = sorted[sorted.length - 1];
    if (pct(best.intent, best.sessions) > overallIntent * 1.3) {
      out.push({
        id: "channel-best",
        priority: 2,
        tone: "green",
        title: `Kanal "${best.label}" paling berminat beli`,
        evidence: `${fmtPct(pct(best.intent, best.sessions))} sesi tertarik beli (rata-rata semua ${fmtPct(overallIntent)}), ${best.paid} pesanan dibayar dari ${best.sessions} sesi.`,
        actions: ["Prioritaskan anggaran/konten di kanal ini; tiru pesan & audiensnya di kanal lain."],
        confidence: best.sessions >= 100 ? "cukup" : "indikasi",
      });
    }
    if (worstC.key !== best.key && pct(worstC.intent, worstC.sessions) < overallIntent * 0.5) {
      out.push({
        id: "channel-worst",
        priority: 2,
        tone: "amber",
        title: `Kanal "${worstC.label}" mendatangkan pengunjung yang kurang berminat`,
        evidence: `${fmtPct(pct(worstC.intent, worstC.sessions))} sesi tertarik beli dari ${worstC.sessions} sesi (rata-rata ${fmtPct(overallIntent)}).`,
        actions: ["Evaluasi targeting & materi iklan/postingan kanal ini; pastikan pesannya sesuai dengan halaman."],
        confidence: worstC.sessions >= 100 ? "cukup" : "indikasi",
      });
    }
  }

  // 5) Kampanye ber-UTM tanpa minat beli sama sekali
  for (const c of d.campaigns.filter((x) => x.sessions >= MIN_SEGMENT && x.intent === 0).slice(0, 2)) {
    out.push({
      id: `campaign-zero-${c.key}`,
      priority: 1,
      tone: "red",
      title: `Kampanye "${c.label}" belum menghasilkan satu pun klik beli`,
      evidence: `${c.sessions} sesi, 0 klik beli/checkout.`,
      actions: ["Jeda atau ubah materi/targeting kampanye ini sebelum menambah anggaran."],
      confidence: c.sessions >= 100 ? "cukup" : "indikasi",
    });
  }
  const bestCampaign = d.campaigns.filter((x) => x.sessions >= MIN_SEGMENT && x.paid > 0).sort((a, b) => pct(b.paid, b.sessions) - pct(a.paid, a.sessions))[0];
  if (bestCampaign) {
    out.push({
      id: "campaign-best",
      priority: 2,
      tone: "green",
      title: `Kampanye "${bestCampaign.label}" menghasilkan penjualan`,
      evidence: `${bestCampaign.paid} pesanan dibayar (${rp(bestCampaign.revenue)}) dari ${bestCampaign.sessions} sesi — ${fmtPct(pct(bestCampaign.paid, bestCampaign.sessions))} konversi.`,
      actions: ["Pertimbangkan menaikkan anggaran bertahap sambil memantau biaya per pesanan di platform iklan."],
      confidence: bestCampaign.sessions >= 100 ? "cukup" : "indikasi",
    });
  }

  // 6) Kebersihan UTM: iklan tanpa utm_campaign → tidak bisa dibedakan per kampanye
  if (d.clickIdWithoutUtm >= 5 && d.paidChannelSessions > 0 && pct(d.clickIdWithoutUtm, d.paidChannelSessions) >= 0.2) {
    out.push({
      id: "utm-hygiene",
      priority: 2,
      tone: "blue",
      title: "Sebagian kunjungan iklan tidak membawa UTM kampanye",
      evidence: `${d.clickIdWithoutUtm} sesi datang dengan ID klik iklan (gclid/fbclid/ttclid) tanpa utm_campaign.`,
      actions: [
        "Tambahkan parameter UTM di setiap iklan, mis. ?utm_source=facebook&utm_medium=paid_social&utm_campaign=bsm-nov&utm_content=video-a.",
        "Di Google Ads: isi 'Final URL suffix' di tingkat akun/kampanye dengan parameter UTM.",
      ],
      confidence: "cukup",
    });
  }
  if (d.ordersTotal > 0 && d.ordersUnattributed > 0) {
    out.push({
      id: "orders-unattributed",
      priority: 3,
      tone: "blue",
      title: `${d.ordersUnattributed} dari ${d.ordersTotal} pesanan belum punya data sumber`,
      evidence: "Pesanan yang dibuat sebelum pencatatan UTM aktif (26 Nov 2026), atau browser memblokir penyimpanan lokal.",
      actions: ["Tidak perlu tindakan — angka ini akan mengecil seiring pesanan baru."],
      confidence: "cukup",
    });
  }

  // 7) Selisih perangkat
  const mob = d.devices.find((x) => x.key === "mobile");
  const desk = d.devices.find((x) => x.key === "desktop");
  if (mob && desk && mob.sessions >= MIN_SEGMENT && desk.sessions >= MIN_SEGMENT) {
    const rm = pct(mob.intent, mob.sessions);
    const rd = pct(desk.intent, desk.sessions);
    if (rm < rd * 0.6) {
      out.push({
        id: "device-mobile",
        priority: 2,
        tone: "amber",
        title: "Pengunjung ponsel jauh lebih jarang tertarik beli dibanding desktop",
        evidence: `Ponsel ${fmtPct(rm)} vs desktop ${fmtPct(rd)} (${mob.sessions} & ${desk.sessions} sesi).`,
        actions: ["Uji halaman di ponsel: ukuran teks, posisi tombol beli (bilah bawah), kecepatan muat, formulir checkout."],
        confidence: Math.min(mob.sessions, desk.sessions) >= 100 ? "cukup" : "indikasi",
      });
    }
  }

  // 8) "Intip isi buku" mendorong minat beli
  const nonPrev = t.sessions - t.preview;
  if (t.preview >= MIN_STEP && nonPrev >= MIN_SEGMENT) {
    const rp1 = pct(t.previewIntent, t.preview);
    const rp0 = pct(t.intent - t.previewIntent, nonPrev);
    if (rp1 >= rp0 * 2 && rp1 > 0) {
      out.push({
        id: "preview",
        priority: 3,
        tone: "green",
        title: "Pengunjung yang mengintip isi buku jauh lebih berminat beli",
        evidence: `${fmtPct(rp1)} vs ${fmtPct(rp0)} untuk yang tidak membuka "Intip isi buku".`,
        actions: ["Tampilkan cuplikan halaman lebih awal (dekat hero) dan pakai di materi iklan."],
        confidence: t.preview >= 100 ? "cukup" : "indikasi",
      });
    }
  }

  // 9) Waktu baca sangat singkat
  if (t.sessions >= MIN_SEGMENT && t.medianEngaged < 10) {
    out.push({
      id: "short-engagement",
      priority: 2,
      tone: "amber",
      title: "Sebagian besar pengunjung hanya sebentar di halaman",
      evidence: `Median waktu aktif ${t.medianEngaged} detik.`,
      actions: ["Cek kesesuaian iklan ↔ halaman dan kecepatan muat; pengunjung yang salah sasaran biasanya pergi < 10 detik."],
      confidence: t.sessions >= 100 ? "cukup" : "indikasi",
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}
