"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Copy, Mail, MapPin, MessageCircle, Receipt, Search, Trash2 } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Badge, Button, Card, Empty, inputCls, Loading, PageHeader, Pagination, StatusBadge } from "@/components/admin/ui";
import { OrderDetailView } from "@/components/admin/order-detail-client";
import { adminShipLabel, shipScheduleFor, type ShipConfig } from "@/lib/shop/shipping-schedule";
import { formatDateTime, formatRupiah } from "@/lib/format";

type Row = { id: number; name: string; email: string; phone: string; created_at: string; orders: number; paid_orders: number; total_spent: number; last_order_at: string | null };

export function CustomersClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const page = Number(sp.get("page") || 1) || 1;
  const qParam = sp.get("q") || "";
  const [q, setQ] = useState(qParam);
  const [data, setData] = useState<{ customers: Row[]; total: number; page: number; pageSize: number } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset saat filter berubah
    setData(null);
    adminFetch<typeof data & object>(`/api/admin/customers?page=${page}&q=${encodeURIComponent(qParam)}`)
      .then(setData)
      .catch((e) => setErr((e as Error).message));
  }, [page, qParam]);

  return (
    <>
      <PageHeader title="Pelanggan" subtitle="Semua pembeli dari checkout situs" />
      <Card>
        <form
          className="relative -mx-5 -mt-5 border-b border-slate-100 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/admin/customers?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <Search className="pointer-events-none absolute top-7 left-7.5 size-4 text-slate-400" />
          <input className={`${inputCls} pl-10`} placeholder="Cari nama, email, atau WhatsApp…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        {err ? (
          <div className="pt-4"><Alert>{err}</Alert></div>
        ) : !data ? (
          <Loading />
        ) : data.customers.length === 0 ? (
          <Empty title="Belum ada pelanggan" />
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Pelanggan</th>
                  <th className="hidden px-5 py-3 md:table-cell">WhatsApp</th>
                  <th className="px-5 py-3 text-right">Pesanan</th>
                  <th className="px-5 py-3 text-right">Total belanja</th>
                  <th className="hidden px-5 py-3 text-right lg:table-cell">Pesanan terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.customers.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/admin/customer?id=${c.id}`)}>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/customer?id=${c.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-slate-900 hover:underline">{c.name}</Link>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </td>
                    <td className="hidden px-5 py-3.5 text-slate-700 md:table-cell">{c.phone}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {c.paid_orders}<span className="text-slate-400">/{c.orders}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{formatRupiah(c.total_spent)}</td>
                    <td className="hidden px-5 py-3.5 text-right text-slate-500 lg:table-cell">{formatDateTime(c.last_order_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => router.push(`/admin/customers?page=${p}&q=${encodeURIComponent(qParam)}`)} />
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-500">Kolom pesanan: dibayar / semua pesanan. Total belanja hanya dari pesanan yang sudah dibayar.</p>
    </>
  );
}

type COrder = {
  id: number;
  order_number: string;
  status: string;
  total: number;
  qty: number;
  courier_name: string;
  courier_service_name: string;
  recipient_name: string;
  area_name: string;
  tracking_number: string | null;
  created_at: string;
  paid_at: string | null;
};
type CAddress = { recipient_name: string; recipient_phone: string; address: string; area_name: string; postal_code: string | null; orders: number; last_used: string };
type CustomerDetail = {
  customer: { id: number; name: string; email: string; phone: string; created_at: string };
  orders: COrder[];
  addresses?: CAddress[];
  shipConfig?: ShipConfig;
};

const PAID = ["paid", "processing", "shipped", "completed"];
const AVATAR = ["bg-sky-100 text-sky-800", "bg-violet-100 text-violet-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-800", "bg-indigo-100 text-indigo-800"];
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "?";
const avatarTone = (name: string) => AVATAR[[...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % AVATAR.length];
const addressText = (a: Pick<CAddress, "recipient_name" | "recipient_phone" | "address" | "area_name" | "postal_code">) =>
  `${a.recipient_name}\n${a.recipient_phone}\n${a.address}\n${a.area_name}${a.postal_code ? ` ${a.postal_code}` : ""}`;

/**
 * Detail pelanggan ala CRM: profil (kontak, alamat, ringkasan) + riwayat transaksi. Klik pesanan → detailnya
 * terbuka di panel kanan pada halaman yang sama (URL ?order=… agar bisa dibagikan & tombol Kembali menutupnya).
 */
export function CustomerDetailClient() {
  const sp = useSearchParams();
  const id = sp.get("id") || "";
  const selected = sp.get("order") || "";
  const router = useRouter();
  const [d, setD] = useState<CustomerDetail | null>(null);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  // true bila panel dibuka dari halaman ini → tutup dengan history.back() agar tombol Kembali browser tetap wajar.
  const openedHere = useRef(false);

  const load = useCallback(() => {
    adminFetch<CustomerDetail>(`/api/admin/customers/${encodeURIComponent(id)}`)
      .then(setD)
      .catch((e) => setErr((e as Error).message));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const base = `/admin/customer?id=${encodeURIComponent(id)}`;
  const open = useCallback(
    (orderId: number) => {
      const url = `${base}&order=${orderId}`;
      if (selected) router.replace(url, { scroll: false });
      else {
        openedHere.current = true;
        router.push(url, { scroll: false });
      }
      // Ponsel/tablet: panel tampil di bawah profil — gulir ke sana.
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        requestAnimationFrame(() => document.getElementById("order-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    },
    [base, selected, router]
  );
  const close = useCallback(() => {
    if (openedHere.current) {
      openedHere.current = false;
      router.back();
    } else router.replace(base, { scroll: false });
  }, [base, router]);

  // Esc menutup panel (kecuali sedang mengetik).
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "Escape" || (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, close]);

  if (err && !d) return <Alert>{err}</Alert>;
  if (!d) return <Loading />;

  const c = d.customer;
  // Data uji: boleh dihapus hanya bila semua pesanannya kedaluwarsa/dibatalkan (tidak ada yang pernah dibayar).
  const deletable = d.orders.every((o) => ["expired", "cancelled"].includes(o.status));
  const paid = d.orders.filter((o) => PAID.includes(o.status));
  const spent = paid.reduce((s, o) => s + o.total, 0);
  const books = paid.reduce((s, o) => s + o.qty, 0);
  const last = d.orders[0];
  const latestAddress = d.addresses?.[0];
  const wa = c.phone.replace(/^\+/, "");
  const idx = d.orders.findIndex((o) => String(o.id) === selected);

  return (
    <>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Semua pelanggan
      </Link>

      {/* ───── Profil pelanggan ───── */}
      <section aria-labelledby="customer-name" className="mt-3 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-bold ${avatarTone(c.name)}`} aria-hidden="true">
            {initials(c.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 id="customer-name" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{c.name}</h1>
              {paid.length >= 2 ? <Badge tone="green">Pelanggan berulang</Badge> : paid.length === 1 ? <Badge tone="blue">Pembeli</Badge> : <Badge>Belum pernah bayar</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Pelanggan sejak {formatDateTime(c.created_at)} · ID #{c.id}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
              <MessageCircle className="size-4" /> Chat WhatsApp
            </a>
            <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 ring-inset hover:bg-slate-50">
              <Mail className="size-4" /> Email
            </a>
            {deletable && (
              <Button
                variant="danger"
                loading={deleting}
                onClick={async () => {
                  if (!window.confirm(`Hapus permanen pelanggan ${c.email} beserta ${d.orders.length} pesanannya? Tidak bisa dikembalikan.`)) return;
                  setDeleting(true);
                  setErr("");
                  try {
                    await adminFetch(`/api/admin/customers/${c.id}`, { method: "DELETE" });
                    router.push("/admin/customers");
                  } catch (e) {
                    setErr((e as Error).message);
                    setDeleting(false);
                  }
                }}
              >
                <Trash2 className="size-4" /> Hapus pelanggan &amp; pesanan uji
              </Button>
            )}
          </div>
        </div>

        {/* Kontak & alamat */}
        <dl className="grid gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr]">
          <ContactField label="Email" value={c.email} href={`mailto:${c.email}`} />
          <ContactField label="WhatsApp" value={c.phone} href={`https://wa.me/${wa}`} external />
          <div className="bg-white px-5 py-4 sm:col-span-2 lg:col-span-1">
            <dt className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden="true" /> Alamat terakhir
              </span>
              {latestAddress && <CopyButton text={addressText(latestAddress)} label="Salin alamat" />}
            </dt>
            {latestAddress ? (
              <dd className="mt-1 text-sm leading-relaxed text-slate-800">
                <span className="font-semibold">{latestAddress.recipient_name}</span> · {latestAddress.recipient_phone}
                <br />
                {latestAddress.address}, {latestAddress.area_name}
                {latestAddress.postal_code ? ` ${latestAddress.postal_code}` : ""}
              </dd>
            ) : (
              <dd className="mt-1 text-sm text-slate-500">—</dd>
            )}
          </div>
        </dl>

        {/* Ringkasan */}
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-b-2xl border-t border-slate-100 bg-slate-100 sm:grid-cols-4">
          <Kpi label="Total belanja" value={formatRupiah(spent)} hint="dari pesanan dibayar" />
          <Kpi label="Pesanan dibayar" value={`${paid.length}`} hint={`dari ${d.orders.length} pesanan`} />
          <Kpi label="Rata-rata per pesanan" value={paid.length ? formatRupiah(Math.round(spent / paid.length)) : "—"} hint={`${books} buku dibeli`} />
          <Kpi label="Pesanan terakhir" value={last ? formatDateTime(last.created_at).split(",")[0] : "—"} hint={last ? last.order_number : undefined} />
        </dl>
      </section>

      {err && <div className="mt-4"><Alert>{err}</Alert></div>}

      {/* ───── Riwayat transaksi + panel detail ───── */}
      <div className={`mt-6 gap-6 lg:grid lg:items-start ${selected ? "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_20rem]"}`}>
        <section aria-labelledby="history-title" className={`rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] ${selected ? "hidden lg:block" : ""}`}>
          <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 id="history-title" className="inline-flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <Receipt className="size-4 text-slate-500" aria-hidden="true" /> Riwayat transaksi
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{d.orders.length}</span>
            </h2>
            {!selected && d.orders.length > 0 && <span className="hidden text-xs text-slate-500 sm:block">Klik pesanan untuk melihat detail di samping</span>}
          </header>
          {d.orders.length === 0 ? (
            <Empty title="Belum ada transaksi" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.orders.map((o) => {
                const active = String(o.id) === selected;
                const ship = (o.status === "paid" || o.status === "processing") && o.paid_at && d.shipConfig ? adminShipLabel(shipScheduleFor(o.paid_at, d.shipConfig).date) : null;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => (active ? close() : open(o.id))}
                      aria-current={active ? "true" : undefined}
                      aria-controls="order-panel"
                      className={`group flex w-full items-center gap-3 px-5 py-3.5 text-left transition ${active ? "bg-slate-900/[0.04] shadow-[inset_3px_0_0_rgb(15_23_42)]" : "hover:bg-slate-50"}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-sm font-semibold text-slate-900 group-hover:underline">{o.order_number}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {formatDateTime(o.created_at)} · {o.qty} buku
                          {!selected && <span className="hidden md:inline"> · {o.courier_name} {o.courier_service_name} · {o.area_name}</span>}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={o.status} />
                          {ship && <Badge tone={ship.tone}>{ship.text}</Badge>}
                          {o.tracking_number && <span className="font-mono text-[11px] text-slate-500">Resi {o.tracking_number}</span>}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold text-slate-900 tabular-nums">{formatRupiah(o.total)}</span>
                      </span>
                      <ChevronRight className={`size-4 shrink-0 transition ${active ? "text-slate-900" : "text-slate-300 group-hover:text-slate-500"}`} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selected ? (
          <div id="order-panel" className="scroll-mt-20 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:rounded-2xl">
            <button type="button" onClick={close} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 lg:hidden">
              <ArrowLeft className="size-4" /> Kembali ke riwayat transaksi
            </button>
            <OrderDetailView
              key={selected}
              panel
              orderId={selected}
              onClose={close}
              onChanged={load}
              onDeleted={() => {
                close();
                load();
              }}
              nav={
                idx >= 0
                  ? {
                      position: `${idx + 1} dari ${d.orders.length}`,
                      onPrev: idx > 0 ? () => open(d.orders[idx - 1].id) : undefined,
                      onNext: idx < d.orders.length - 1 ? () => open(d.orders[idx + 1].id) : undefined,
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <aside className="mt-6 lg:mt-0">
            <Card title={`Alamat pengiriman (${d.addresses?.length ?? 0})`}>
              {d.addresses?.length ? (
                <ul className="-my-1 space-y-3">
                  {d.addresses.map((a, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900">{a.recipient_name}</p>
                        <CopyButton text={addressText(a)} label="Salin" />
                      </div>
                      <p className="text-slate-600">{a.recipient_phone}</p>
                      <p className="mt-1 leading-relaxed text-slate-700">
                        {a.address}, {a.area_name}
                        {a.postal_code ? ` ${a.postal_code}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {i === 0 ? "Terakhir dipakai" : "Dipakai"} {formatDateTime(a.last_used).split(",")[0]} · {a.orders} pesanan
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Belum ada alamat.</p>
              )}
            </Card>
          </aside>
        )}
      </div>
    </>
  );
}

function ContactField({ label, value, href, external }: { label: string; value: string; href: string; external?: boolean }) {
  return (
    <div className="min-w-0 bg-white px-5 py-4">
      <dt className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
        {label}
        <CopyButton text={value} label={`Salin ${label.toLowerCase()}`} />
      </dt>
      <dd className="mt-1 truncate text-sm font-medium">
        <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="text-slate-900 hover:underline">
          {value}
        </a>
      </dd>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-bold tracking-tight text-slate-900 tabular-nums">{value}</dd>
      {hint && <dd className="truncate text-xs text-slate-500">{hint}</dd>}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      aria-label={label}
      title={label}
    >
      {done ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      <span>{done ? "Tersalin" : "Salin"}</span>
    </button>
  );
}
