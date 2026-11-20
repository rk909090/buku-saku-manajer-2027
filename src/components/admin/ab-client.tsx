"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Flag, MousePointerClick, PartyPopper, Percent, ShoppingBag, TrendingUp, Trophy, Users, Wallet, type LucideIcon } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Badge, Card, Loading, PageHeader } from "@/components/admin/ui";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { pickLeader, type Leader } from "@/lib/ab-leader";

type V = {
  variant: string;
  views: number;
  visitors: number;
  clicks: number;
  clickers: number;
  conversion_rate: number;
  vs_control: null | { uplift: number | null; p_value: number | null; significant_95?: boolean; enough_data: boolean };
};
type Orders = { variant: string; orders: number; paid_orders: number; revenue: number };
type Resp = {
  stats: {
    first_event: string | null;
    last_event: string | null;
    preview_events_excluded: number | null;
    variants: V[];
    orders_by_variant: Orders[];
  };
  variants: { id: string; name: string; kicker: string; headline: string }[];
};

const pct = (n: number | null | undefined) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

/* ───────────── Halaman ───────────── */

export function AbClient() {
  const [d, setD] = useState<Resp | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    adminFetch<Resp>("/api/admin/ab").then(setD).catch((e) => setErr((e as Error).message));
  }, []);
  if (err) return <Alert>{err}</Alert>;
  if (!d) return <Loading />;
  const leader = pickLeader(d.stats.variants, d.stats.orders_by_variant);
  const control = d.stats.variants.find((v) => v.variant === "a");

  return (
    <>
      <PageHeader
        title="Analitik A/B headline"
        subtitle={`Data ${formatDateTime(d.stats.first_event)} – ${formatDateTime(d.stats.last_event)} · pratinjau internal dikecualikan (${d.stats.preview_events_excluded || 0} event)`}
      />
      {/* pt-4: ruang untuk pita "Pemenang" yang menonjol di atas kartu. */}
      <div className="grid gap-6 pt-4 lg:grid-cols-3">
        {d.stats.variants.map((v) => {
          const meta = d.variants.find((x) => x.id === v.variant);
          const ord = d.stats.orders_by_variant.find((o) => o.variant === v.variant);
          const isControl = v.variant === "a";
          const isLeader = leader?.id === v.variant;
          const body = (
            <>
              <p className={`text-xs ${isLeader ? "text-amber-800/80" : "text-slate-500"}`}>{meta?.kicker}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{meta?.headline}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <M k="Pengunjung unik" v={v.visitors} gold={isLeader} />
                <M k="Klik beli (unik)" v={v.clickers} gold={isLeader} />
                <M k="Konversi klik" v={pct(v.conversion_rate)} strong highlight={isLeader} />
                <M k="Uplift vs A" v={isControl ? "—" : pct(v.vs_control?.uplift)} gold={isLeader} />
                <M k="Pesanan dibayar" v={ord?.paid_orders ?? 0} gold={isLeader} />
                <M k="Pendapatan" v={formatRupiah(ord?.revenue ?? 0)} gold={isLeader} />
              </dl>
              {!isControl && v.vs_control && !isLeader && (
                <p className="mt-4 text-xs text-slate-500">
                  {v.vs_control.enough_data
                    ? v.vs_control.significant_95
                      ? `Signifikan secara statistik (p = ${v.vs_control.p_value}).`
                      : `Belum signifikan (p = ${v.vs_control.p_value}).`
                    : "Data belum cukup (min. 100 pengunjung per varian & 20 klik)."}
                </p>
              )}
            </>
          );
          return isLeader && leader ? (
            <WinnerCard key={v.variant} v={v} leader={leader} isControl={isControl} control={control}>
              {body}
            </WinnerCard>
          ) : (
            <Card key={v.variant} title={<span>Varian {v.variant.toUpperCase()} {isControl && <Badge>Kontrol</Badge>}</span>}>
              {body}
            </Card>
          );
        })}
      </div>
      <MetricGuide variants={d.stats.variants} leaderId={leader?.id} />
    </>
  );
}

/* ───────────── Panduan membaca metrik ───────────── */

type GuideItem = { icon: LucideIcon; term: string; text: React.ReactNode; example?: string };

/** Penjelasan setiap metrik dalam bahasa sehari-hari, dengan contoh hitungan dari data yang sedang tampil. */
function MetricGuide({ variants, leaderId }: { variants: V[]; leaderId?: string }) {
  const a = variants.find((v) => v.variant === "a");
  // Contoh dari varian terbaik (atau varian pertama yang punya data); uplift dari varian non-kontrol.
  const ex = variants.find((v) => v.variant === leaderId) || variants.find((v) => v.visitors > 0);
  const exUp = [ex, ...variants].find((v) => v && v.variant !== "a" && v.visitors > 0 && v.vs_control?.uplift != null);
  const L = (v: V) => `Varian ${v.variant.toUpperCase()}`;

  const metrics: GuideItem[] = [
    {
      icon: Users,
      term: "Pengunjung unik",
      text: "Jumlah orang berbeda yang melihat headline varian ini. Satu orang yang membuka halaman berkali-kali dari browser yang sama tetap dihitung 1. Kunjungan pratinjau tim (link ?hl=) tidak dihitung.",
      example: ex && `${L(ex)}: dilihat ${ex.visitors} orang.`,
    },
    {
      icon: MousePointerClick,
      term: "Klik beli (unik)",
      text: "Jumlah pengunjung unik yang menekan tombol beli di halaman (di bagian atas, penawaran, atau bilah bawah ponsel). Orang yang mengklik berkali-kali tetap dihitung 1.",
      example: ex && `${L(ex)}: ${ex.clickers} dari ${ex.visitors} orang mengklik tombol beli.`,
    },
    {
      icon: Percent,
      term: "Konversi klik",
      text: (
        <>
          Persentase pengunjung yang tertarik membeli: <b>klik beli ÷ pengunjung unik</b>. Ini <b>metrik utama</b> untuk menentukan headline terbaik — makin tinggi makin baik.
        </>
      ),
      example: ex && ex.visitors ? `${L(ex)}: ${ex.clickers} ÷ ${ex.visitors} = ${pct(ex.conversion_rate)}.` : undefined,
    },
    {
      icon: TrendingUp,
      term: "Uplift vs A",
      text: (
        <>
          Seberapa jauh konversi varian ini lebih tinggi (+) atau lebih rendah (−) dibanding Varian A, dihitung <b>relatif terhadap A</b> — bukan selisih poin persen.
        </>
      ),
      example:
        exUp && a && a.conversion_rate
          ? `${L(exUp)} ${pct(exUp.conversion_rate)} vs A ${pct(a.conversion_rate)} → (${(exUp.conversion_rate * 100).toFixed(1)} − ${(a.conversion_rate * 100).toFixed(1)}) ÷ ${(a.conversion_rate * 100).toFixed(1)} = ${exUp.vs_control!.uplift! >= 0 ? "+" : ""}${(exUp.vs_control!.uplift! * 100).toFixed(1)}%.`
          : undefined,
    },
    {
      icon: ShoppingBag,
      term: "Pesanan dibayar",
      text: "Jumlah pesanan dari checkout situs yang sudah lunas (dibayar, diproses, dikirim, atau selesai) oleh pembeli yang melihat varian ini saat membuat pesanan.",
    },
    {
      icon: Wallet,
      term: "Pendapatan",
      text: "Total nilai pesanan dibayar tersebut, sudah termasuk ongkos kirim dan setelah diskon/kupon.",
    },
  ];

  const labels: GuideItem[] = [
    {
      icon: Flag,
      term: "Kontrol (Varian A)",
      text: "Headline pembanding. Varian lain dinilai dengan membandingkannya ke Varian A.",
    },
    {
      icon: Trophy,
      term: "Unggul sementara / Pemenang",
      text: (
        <>
          Kartu bersorot emas = konversi klik tertinggi saat ini. <b>Unggul sementara</b> berarti datanya belum cukup atau selisihnya belum meyakinkan — urutan
          masih bisa berubah. <b>Pemenang</b> baru muncul bila unggulnya signifikan secara statistik dibanding semua varian lain.
        </>
      ),
    },
    {
      icon: FlaskConical,
      term: "Data cukup & signifikan (p)",
      text: (
        <>
          Data dianggap cukup bila tiap varian punya <b>min. 100 pengunjung unik</b> dan total <b>min. 20 klik</b>. Nilai <b>p</b> = peluang perbedaan itu
          hanya kebetulan; <b>p di bawah 0,05</b> (kurang dari 5%) dianggap signifikan.
        </>
      ),
    },
  ];

  const Item = ({ it }: { it: GuideItem }) => (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
        <it.icon className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-sm font-semibold text-slate-900">{it.term}</dt>
        <dd className="mt-1 text-sm leading-relaxed text-slate-600">{it.text}</dd>
        {it.example && <dd className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">Contoh — {it.example}</dd>}
      </div>
    </div>
  );

  return (
    <section aria-labelledby="ab-guide-title" className="mt-10">
      <h2 id="ab-guide-title" className="text-lg font-semibold tracking-tight text-slate-900">Cara membaca metrik</h2>
      <p className="mt-1 text-sm text-slate-500">Penjelasan singkat setiap angka di kartu varian, dengan contoh dari data yang sedang tampil.</p>
      <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((it) => (
          <Item key={it.term} it={it} />
        ))}
      </dl>
      <h3 className="mt-6 text-sm font-semibold text-slate-900">Label & keputusan</h3>
      <dl className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {labels.map((it) => (
          <Item key={it.term} it={it} />
        ))}
      </dl>
      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <b>Tips:</b> jangan mengganti headline permanen saat label masih “Unggul sementara”. Tunggu sampai data cukup dan muncul label “Pemenang”.
      </p>
    </section>
  );
}

/* ───────────── Kartu varian terbaik ───────────── */

const CONFETTI = [
  { l: 6, d: 0, c: "#f59e0b" }, { l: 14, d: 1.4, c: "#ec4899" }, { l: 22, d: 2.6, c: "#10b981" }, { l: 30, d: 0.7, c: "#3b82f6" },
  { l: 38, d: 2.1, c: "#f97316" }, { l: 46, d: 3.1, c: "#eab308" }, { l: 54, d: 0.4, c: "#8b5cf6" }, { l: 62, d: 1.8, c: "#ef4444" },
  { l: 70, d: 2.9, c: "#14b8a6" }, { l: 78, d: 1.1, c: "#f59e0b" }, { l: 86, d: 2.4, c: "#ec4899" }, { l: 94, d: 0.9, c: "#22c55e" },
];

function WinnerCard({ v, leader, isControl, control, children }: { v: V; leader: Leader; isControl: boolean; control?: V; children: React.ReactNode }) {
  const uplift = !isControl && v.vs_control?.uplift != null ? v.vs_control.uplift : null;
  return (
    <div className="relative lg:-translate-y-2">
      {/* Pita di atas kartu */}
      <div className="pointer-events-none absolute -top-4 left-1/2 z-20 -translate-x-1/2">
        <span
          className={`ab-ribbon-shine inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold tracking-[0.14em] whitespace-nowrap uppercase shadow-lg ring-2 ring-white ${
            leader.final ? "bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-amber-950 shadow-amber-500/50" : "bg-gradient-to-r from-amber-400 via-yellow-200 to-orange-400 text-amber-950 shadow-amber-400/40"
          }`}
        >
          <Trophy className="ab-trophy-bounce size-4" aria-hidden="true" /> {leader.final ? "Pemenang" : "Unggul sementara"}
        </span>
      </div>

      {/* Bingkai gradasi emas + cahaya */}
      <section
        aria-label={`Varian ${v.variant.toUpperCase()} — ${leader.final ? "pemenang" : "unggul sementara"}`}
        className="relative h-full rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-400 p-[2px] shadow-[0_20px_50px_-14px_rgb(245_158_11/0.6)]"
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[14px] bg-gradient-to-b from-amber-50 via-white to-white">
          {/* Konfeti (dinonaktifkan untuk pengguna yang memilih kurangi gerakan) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden" aria-hidden="true">
            {CONFETTI.map((p, i) => (
              <span key={i} className="ab-confetti" style={{ left: `${p.l}%`, background: p.c, animationDelay: `${p.d}s` }} />
            ))}
          </div>
          <Trophy className="pointer-events-none absolute -right-4 top-10 size-36 rotate-12 text-amber-400/15" aria-hidden="true" />

          <header className="relative flex items-center justify-between gap-3 border-b border-amber-200/70 px-5 py-4">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              Varian {v.variant.toUpperCase()} {isControl && <Badge>Kontrol</Badge>}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-300/60">
              <PartyPopper className="size-3.5" aria-hidden="true" /> #1
            </span>
          </header>

          <div className="relative flex-1 p-5">
            {children}
            <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-100 via-yellow-50 to-orange-100 px-4 py-3 ring-1 ring-amber-200/70">
              <p className="text-sm font-bold text-amber-900">
                🎉 Konversi tertinggi: {pct(v.conversion_rate)}
                {uplift != null && ` · ${uplift >= 0 ? "+" : ""}${(uplift * 100).toFixed(1)}% vs A`}
                {isControl && control && " · kontrol masih terbaik"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/75">{leader.note}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function M({ k, v, strong, highlight, gold }: { k: string; v: React.ReactNode; strong?: boolean; highlight?: boolean; gold?: boolean }) {
  const box = highlight
    ? "bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-md shadow-amber-500/30"
    : gold
      ? "bg-amber-50/80 ring-1 ring-amber-100"
      : "bg-slate-50";
  return (
    <div className={`rounded-xl p-3 ${box}`}>
      <dt className={`text-xs ${highlight ? "text-white/85" : "text-slate-500"}`}>{k}</dt>
      <dd className={`mt-0.5 tabular-nums ${highlight ? "text-2xl font-extrabold text-white" : strong ? "text-lg font-bold text-slate-900" : "font-semibold text-slate-800"}`}>{v}</dd>
    </div>
  );
}
