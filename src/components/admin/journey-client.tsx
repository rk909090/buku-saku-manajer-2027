"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  ChevronDown,
  CreditCard,
  Eye,
  HelpCircle,
  Lightbulb,
  LogIn,
  LogOut,
  MessageCircle,
  MousePointerClick,
  ScrollText,
  ShoppingCart,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Badge, Card, Empty, Loading, PageHeader, StatusBadge } from "@/components/admin/ui";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { EVENT_LABEL, sectionLabel, type JourneyEvent } from "@/lib/journey-config";
import type { Insight, Segment } from "@/lib/journey-insights";

type Step = { event: JourneyEvent; path: string | null; detail: string | null; value: number | null; at: string };
type Data = {
  days: number;
  withInternal: boolean;
  truncated: boolean;
  totals: Segment & { visitors: number; avgEngaged: number; medianEngaged: number; avgScroll: number; preview: number; whatsapp: number; landingSessions: number };
  funnel: { key: string; label: string; count: number }[];
  channels: Segment[];
  sources: Segment[];
  campaigns: Segment[];
  contents: Segment[];
  devices: Segment[];
  sections: { id: string; label: string; reached: number }[];
  landingNoIntent: number;
  exits: { id: string; label: string; n: number }[];
  ordersAttribution: { total: number; unattributed: number; linkedToSession: number; byChannel: { key: string; orders: number; paid: number; revenue: number; pending: number }[] };
  pendingNow: { count: number; value: number };
  daily: { day: string; sessions: number; intent: number; orders: number; paid: number }[];
  recent: {
    id: string;
    startedAt: string;
    channel: string;
    source: string;
    campaign: string | null;
    content: string | null;
    device: string | null;
    engagedS: number;
    maxScroll: number;
    steps: Step[];
    orders: { id: number; number: string; status: string; total: number }[];
  }[];
  insights: Insight[];
};

const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "—");
const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}d` : `${s}d`);

export function JourneyClient() {
  const [days, setDays] = useState(30);
  const [internal, setInternal] = useState(false);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tampilkan pemuatan saat filter berubah
    setD(null);
    adminFetch<Data>(`/api/admin/journey?days=${days}${internal ? "&internal=1" : ""}`)
      .then((x) => alive && setD(x))
      .catch((e) => alive && setErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [days, internal]);

  return (
    <>
      <PageHeader
        title="Perjalanan Pengunjung"
        subtitle="Dari mana pengunjung datang, apa yang mereka lakukan di halaman, dan sampai mana — data anonim yang dicatat situs sendiri"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200" role="group" aria-label="Rentang waktu">
              {[7, 30, 90].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDays(n)}
                  aria-pressed={days === n}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${days === n ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {n} hari
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="size-4 accent-slate-900" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
              Sertakan kunjungan internal
            </label>
          </div>
        }
      />
      {err ? <Alert>{err}</Alert> : !d ? <Loading /> : <Report d={d} />}
    </>
  );
}

function Report({ d }: { d: Data }) {
  const t = d.totals;
  if (t.sessions === 0 && d.ordersAttribution.total === 0) {
    return (
      <Card>
        <Empty
          title="Belum ada data perjalanan"
          text="Pencatatan dimulai 26 Nov 2026. Data akan muncul setelah ada pengunjung yang membuka landing page atau checkout."
        />
      </Card>
    );
  }
  return (
    <div className="space-y-8">
      {d.truncated && <Alert tone="amber">Data dibatasi 20.000 sesi terbaru untuk periode ini.</Alert>}

      {/* Rekomendasi */}
      <section aria-labelledby="insights-title">
        <h2 id="insights-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Lightbulb className="size-5 text-amber-500" aria-hidden="true" /> Rekomendasi aksi
        </h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">
          Dihitung otomatis dari data {d.days} hari terakhir dengan aturan yang tetap (bukan tebakan AI). Label <b>indikasi</b> = sampel masih kecil; konfirmasi
          dengan data lebih banyak sebelum keputusan besar.
        </p>
        {d.insights.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">Belum ada pola yang menonjol. Rekomendasi muncul setelah data cukup.</p>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {d.insights.map((i) => (
              <InsightCard key={i.id} i={i} />
            ))}
          </div>
        )}
      </section>

      {/* KPI */}
      <section aria-label="Ringkasan" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Sesi" value={t.sessions.toLocaleString("id-ID")} hint={`${t.visitors.toLocaleString("id-ID")} pengunjung unik`} />
        <Kpi label="Terlibat" value={pct(t.engaged, t.sessions)} hint={`${t.engaged} sesi`} />
        <Kpi label="Tertarik beli" value={pct(t.intent, t.sessions)} hint={`${t.intent} sesi`} />
        <Kpi label="Pesanan dibuat" value={String(d.ordersAttribution.total)} hint={`${t.orders} dari sesi tercatat`} />
        <Kpi label="Dibayar" value={String(d.ordersAttribution.byChannel.reduce((n, c) => n + c.paid, 0))} hint={formatRupiah(d.ordersAttribution.byChannel.reduce((n, c) => n + c.revenue, 0))} />
        <Kpi label="Waktu aktif (median)" value={dur(t.medianEngaged)} hint={`rata-rata ${dur(t.avgEngaged)}`} />
        <Kpi label="Gulir rata-rata" value={`${t.avgScroll}%`} hint="kedalaman landing" />
      </section>

      {/* Funnel */}
      <Card title="Funnel: dari datang sampai bayar">
        <ol className="space-y-2.5">
          {d.funnel.map((f, i) => {
            const prev = i > 0 ? d.funnel[i - 1].count : f.count;
            const w = t.sessions ? Math.max(1.5, (f.count / t.sessions) * 100) : 0;
            return (
              <li key={f.key} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr_9rem]">
                <span className="font-medium text-slate-700">{f.label}</span>
                <span className="relative h-7 overflow-hidden rounded-lg bg-slate-100">
                  <span className="absolute inset-y-0 left-0 rounded-lg bg-slate-900" style={{ width: `${w}%` }} />
                  <span className="absolute inset-y-0 left-2 flex items-center text-xs font-semibold text-white mix-blend-difference">{f.count.toLocaleString("id-ID")}</span>
                </span>
                <span className="text-right text-xs text-slate-500 tabular-nums">
                  {i === 0 ? "100%" : pct(f.count, t.sessions)}
                  {i > 0 && <span className={`ml-1.5 ${prev && f.count / prev < 0.5 ? "font-semibold text-rose-700" : ""}`}>({pct(f.count, prev)} lanjut)</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Angka = jumlah sesi yang mencapai langkah itu. “Pesanan dibuat/Dibayar” hanya menghitung pesanan yang bisa dihubungkan ke sesi tercatat (
          {d.ordersAttribution.linkedToSession} dari {d.ordersAttribution.total} pesanan periode ini).
        </p>
      </Card>

      {/* Tabel segmen selebar penuh agar semua kolom terbaca tanpa geser ke samping. */}
      <SegmentTable title="Kanal" rows={d.channels} total={t.sessions} />
      <SegmentTable title="Kampanye (utm_campaign)" rows={d.campaigns} total={t.sessions} empty="Belum ada kunjungan dengan utm_campaign. Tambahkan UTM di link iklan agar kampanye bisa dibandingkan." />
      <SegmentTable title="Materi iklan (utm_content)" rows={d.contents} total={t.sessions} empty="Belum ada utm_content." />
      <SegmentTable title="Sumber / medium" rows={d.sources} total={t.sessions} />
      <SegmentTable title="Perangkat" rows={d.devices} total={t.sessions} />

      {/* Seksi landing */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Seksi landing yang dilihat">
          {t.landingSessions === 0 ? (
            <p className="text-sm text-slate-500">Belum ada sesi landing page.</p>
          ) : (
            <ol className="space-y-2">
              {d.sections.map((s) => {
                const p = s.reached / t.landingSessions;
                return (
                  <li key={s.id} className="grid grid-cols-[10rem_1fr_3.5rem] items-center gap-3 text-sm">
                    <span className="truncate text-slate-700">{s.label}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-sky-600" style={{ width: `${Math.min(100, p * 100)}%` }} />
                    </span>
                    <span className="text-right text-xs text-slate-600 tabular-nums">{(p * 100).toFixed(0)}%</span>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-4 text-xs text-slate-500">Persentase dari {t.landingSessions} sesi yang membuka landing page. Seksi dihitung terlihat saat melewati bagian tengah layar.</p>
        </Card>
        <Card title="Terakhir terlihat sebelum pergi">
          {d.exits.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {d.exits.slice(0, 8).map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-slate-700">{x.label}</span>
                  <span className="text-slate-500 tabular-nums">
                    {x.n} <span className="text-xs">({pct(x.n, d.landingNoIntent)})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">Dari {d.landingNoIntent} sesi landing yang tidak klik beli — seksi terakhir yang sempat mereka lihat.</p>
        </Card>
      </div>

      {/* Atribusi pesanan */}
      <Card title="Sumber pesanan (termasuk yang belum/tidak dibayar)">
        {d.ordersAttribution.total === 0 ? (
          <p className="text-sm text-slate-500">Belum ada pesanan pada periode ini.</p>
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-2.5">Kanal (atribusi pesanan)</th>
                  <th className="px-5 py-2.5 text-right">Pesanan</th>
                  <th className="px-5 py-2.5 text-right">Dibayar</th>
                  <th className="px-5 py-2.5 text-right">Menunggu bayar</th>
                  <th className="px-5 py-2.5 text-right">Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.ordersAttribution.byChannel.map((c) => (
                  <tr key={c.key}>
                    <td className="px-5 py-2.5 font-medium text-slate-800">{c.key}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{c.orders}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{c.paid}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{c.pending}</td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{formatRupiah(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-5 py-3 text-xs text-slate-500">
              Atribusi pesanan = sumber terakhir yang bukan “langsung” sebelum memesan (last non-direct, seperti GA4). “Belum tercatat” = pesanan sebelum 26 Nov 2026.
              Detail UTM tiap pesanan ada di halaman pesanan & ekspor CSV.
            </p>
          </div>
        )}
      </Card>

      {/* Tren harian */}
      {d.daily.length > 1 && <DailyChart daily={d.daily} />}

      {/* Perjalanan terbaru */}
      <section aria-labelledby="recent-title">
        <h2 id="recent-title" className="text-lg font-semibold text-slate-900">Perjalanan terbaru</h2>
        <p className="mt-1 mb-4 text-sm text-slate-500">50 sesi terakhir. Klik untuk melihat langkah demi langkah.</p>
        {d.recent.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">Belum ada sesi.</p>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {d.recent.map((r) => (
                <SessionRow key={r.id} r={r} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <Guide />
    </div>
  );
}

function InsightCard({ i }: { i: Insight }) {
  const tone = { red: "border-l-rose-500", amber: "border-l-amber-500", blue: "border-l-sky-500", green: "border-l-emerald-500" }[i.tone];
  return (
    <article className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-5 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={i.priority === 1 ? "red" : i.priority === 2 ? "amber" : "slate"}>{i.priority === 1 ? "Prioritas tinggi" : i.priority === 2 ? "Prioritas sedang" : "Info"}</Badge>
        <Badge tone={i.confidence === "cukup" ? "green" : "slate"}>{i.confidence === "cukup" ? "Data cukup" : "Indikasi"}</Badge>
      </div>
      <h3 className="mt-2.5 font-semibold text-slate-900">{i.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{i.evidence}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-800">
        {i.actions.map((a) => (
          <li key={a} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            {a}
          </li>
        ))}
      </ul>
      {i.link && (
        <Link href={i.link.href} className="mt-3 inline-block text-sm font-semibold text-slate-900 underline underline-offset-2">
          {i.link.label} →
        </Link>
      )}
    </article>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SegmentTable({ title, rows, total, compact, empty }: { title: string; rows: Segment[]; total: number; compact?: boolean; empty?: string }) {
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{empty || "Belum ada data."}</p>
      ) : (
        <div className="-mx-5 -my-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-2.5">{compact ? "Nama" : "Segmen"}</th>
                <th className="px-3 py-2.5 text-right">Sesi</th>
                {!compact && <th className="px-3 py-2.5 text-right">Terlibat</th>}
                <th className="px-3 py-2.5 text-right">Tertarik beli</th>
                {!compact && <th className="px-3 py-2.5 text-right">Checkout</th>}
                <th className="px-3 py-2.5 text-right">Pesanan</th>
                <th className="px-3 py-2.5 text-right">Dibayar</th>
                <th className="px-5 py-2.5 text-right">Pendapatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="max-w-[16rem] truncate px-5 py-2.5 font-medium text-slate-800" title={r.label}>
                    {r.label}
                    <span className="ml-1.5 text-xs font-normal text-slate-400">{pct(r.sessions, total)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.sessions}</td>
                  {!compact && <td className="px-3 py-2.5 text-right tabular-nums">{pct(r.engaged, r.sessions)}</td>}
                  <td className="px-3 py-2.5 text-right tabular-nums">{pct(r.intent, r.sessions)}</td>
                  {!compact && <td className="px-3 py-2.5 text-right tabular-nums">{r.checkout}</td>}
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.orders}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.paid}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{formatRupiah(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function DailyChart({ daily }: { daily: Data["daily"] }) {
  const max = Math.max(1, ...daily.map((x) => x.sessions));
  return (
    <Card title="Tren harian">
      <div className="flex h-40 gap-1" role="img" aria-label="Sesi, minat beli, dan pesanan per hari">
        {daily.map((x) => (
          <div key={x.day} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="relative w-full flex-1" title={`${x.day}: ${x.sessions} sesi, ${x.intent} tertarik beli, ${x.orders} pesanan (${x.paid} dibayar)`}>
              <div className="absolute inset-x-0 bottom-0 rounded-t bg-slate-200" style={{ height: `${(x.sessions / max) * 100}%` }} />
              <div className="absolute inset-x-1 bottom-0 rounded-t bg-slate-900" style={{ height: `${(x.intent / max) * 100}%` }} />
              {x.orders > 0 && <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-emerald-500" />}
            </div>
            <span className="text-[10px] text-slate-400 tabular-nums">{Number(x.day.slice(8))}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-slate-200" /> Sesi</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-slate-900" /> Tertarik beli</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" /> Ada pesanan</span>
      </p>
    </Card>
  );
}

const ICON: Partial<Record<JourneyEvent, LucideIcon>> = {
  session_start: LogIn,
  page_view: Eye,
  section_view: ScrollText,
  scroll: Activity,
  cta_click: MousePointerClick,
  preview_open: BookOpen,
  faq_open: HelpCircle,
  whatsapp_click: MessageCircle,
  begin_checkout: ShoppingCart,
  shipping_selected: Truck,
  coupon_applied: Tag,
  pay_click: CreditCard,
  page_leave: LogOut,
};
const PATH_LABEL: Record<string, string> = { "/": "Landing", "/checkout": "Checkout", "/checkout/status": "Status pesanan" };

function stepText(s: Step) {
  switch (s.event) {
    case "page_view":
      return `${EVENT_LABEL.page_view}: ${PATH_LABEL[s.path || ""] || s.path}`;
    case "section_view":
      return `${EVENT_LABEL.section_view}: ${sectionLabel(s.detail)}`;
    case "scroll":
      return `Gulir ${s.value}%`;
    case "cta_click":
      return `${EVENT_LABEL.cta_click}${s.detail ? ` (${s.detail})` : ""}`;
    case "preview_open":
      return `${EVENT_LABEL.preview_open}${s.detail ? `: ${s.detail}` : ""}`;
    case "faq_open":
      return `${EVENT_LABEL.faq_open} ${s.detail || ""}`;
    case "shipping_selected":
      return `${EVENT_LABEL.shipping_selected}${s.detail ? `: ${s.detail.toUpperCase()}` : ""}`;
    case "page_leave":
      return `Aktif ${dur(s.value || 0)} lalu meninggalkan ${PATH_LABEL[s.path || ""] || "halaman"}`;
    default:
      return EVENT_LABEL[s.event] || s.event;
  }
}

/** Ringkas langkah untuk baris daftar (tanpa seksi/gulir yang terlalu rinci). */
function milestones(steps: Step[]) {
  const keys: JourneyEvent[] = ["preview_open", "faq_open", "whatsapp_click", "cta_click", "begin_checkout", "shipping_selected", "coupon_applied", "pay_click"];
  const seen = new Set<string>();
  return steps.filter((s) => keys.includes(s.event) && !seen.has(s.event) && seen.add(s.event));
}

function SessionRow({ r }: { r: Data["recent"][number] }) {
  const [open, setOpen] = useState(false);
  const start = r.steps[0] ? +new Date(r.steps[0].at) : +new Date(r.startedAt);
  const ms = milestones(r.steps);
  const sectionsSeen = r.steps.filter((s) => s.event === "section_view").length;
  return (
    <li>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 px-5 py-3.5 text-left hover:bg-slate-50">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{r.channel}</span>
            <span className="truncate text-xs text-slate-500">{r.source}</span>
            {r.campaign && <Badge tone="violet">{r.campaign}</Badge>}
            {r.content && <span className="text-xs text-slate-500">· {r.content}</span>}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {formatDateTime(r.startedAt)} · {r.device === "mobile" ? "Ponsel" : r.device === "desktop" ? "Desktop" : r.device || "—"} · aktif {dur(r.engagedS)} · gulir {r.maxScroll}% · {sectionsSeen} seksi
          </span>
          {ms.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {ms.map((s, i) => {
                const I = ICON[s.event] || Activity;
                return (
                  <span key={i} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                    <I className="size-3" aria-hidden="true" /> {EVENT_LABEL[s.event]}
                  </span>
                );
              })}
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          {r.orders.length ? r.orders.map((o) => <StatusBadge key={o.id} status={o.status} />) : <span className="text-xs text-slate-400">tanpa pesanan</span>}
          <ChevronDown className={`size-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          {r.orders.length > 0 && (
            <p className="mb-3 text-sm">
              Pesanan:{" "}
              {r.orders.map((o, i) => (
                <span key={o.id}>
                  {i > 0 && ", "}
                  <Link href={`/admin/order?id=${o.id}`} className="font-mono font-semibold text-slate-900 underline underline-offset-2">
                    {o.number}
                  </Link>{" "}
                  ({formatRupiah(o.total)})
                </span>
              ))}
            </p>
          )}
          <ol className="relative space-y-2 border-l border-slate-200 pl-5">
            {r.steps.map((s, i) => {
              const I = ICON[s.event] || Activity;
              const offset = Math.max(0, Math.round((+new Date(s.at) - start) / 1000));
              return (
                <li key={i} className="relative text-sm">
                  <span className="absolute top-0.5 -left-[29px] grid size-4.5 place-items-center rounded-full bg-white ring-1 ring-slate-300">
                    <I className="size-2.5 text-slate-600" aria-hidden="true" />
                  </span>
                  <span className="text-slate-800">{stepText(s)}</span>
                  <span className="ml-2 text-xs text-slate-400 tabular-nums">+{dur(offset)}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </li>
  );
}

function Guide() {
  const items: [string, string][] = [
    ["Sesi", "Satu kunjungan. Sesi baru dimulai bila tidak ada aktivitas 30 menit, atau pengunjung datang lagi dari iklan/sumber lain."],
    ["Pengunjung unik", "Jumlah browser berbeda (ID acak anonim, tanpa nama/email/IP)."],
    ["Terlibat", "Sesi yang aktif ≥ 10 detik, menggulir ≥ 50%, atau melakukan sesuatu (klik beli, intip isi, WhatsApp, checkout)."],
    ["Tertarik beli", "Sesi yang menekan tombol beli atau membuka halaman checkout."],
    ["Kanal", "Kelompok sumber kedatangan: iklan (dari UTM berbayar / ID klik iklan), pencarian organik, media sosial, WhatsApp, situs Human Plus, referral, atau langsung."],
    ["UTM", "Parameter di link iklan (utm_source, utm_medium, utm_campaign, utm_content, utm_term). Tanpa UTM, kampanye tidak bisa dibedakan."],
    ["Atribusi pesanan", "Sumber terakhir yang bukan 'langsung' sebelum memesan — jadi pembeli yang kembali lewat bookmark tetap dihitung dari iklannya."],
    ["Kunjungan internal", "Pratinjau ?hl= dan browser yang sedang login dashboard. Tidak dihitung kecuali dicentang."],
  ];
  return (
    <section aria-labelledby="guide-title" className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 id="guide-title" className="font-semibold text-slate-900">Cara membaca halaman ini</h2>
      <dl className="mt-3 grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
        {items.map(([k, v]) => (
          <div key={k}>
            <dt className="font-medium text-slate-800">{k}</dt>
            <dd className="text-slate-600">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-slate-500">
        Data dicatat oleh situs sendiri (bukan GA4), sehingga bisa dihubungkan ke pesanan. Pengunjung yang memblokir JavaScript/penyimpanan atau
        bot tidak tercatat, jadi angka bisa sedikit berbeda dengan GA4.
      </p>
    </section>
  );
}
