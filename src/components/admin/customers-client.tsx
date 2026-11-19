"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Search, Trash2 } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Button, Card, Empty, inputCls, Loading, PageHeader, Pagination, Stat, StatusBadge } from "@/components/admin/ui";
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

type CustomerDetail = {
  customer: { id: number; name: string; email: string; phone: string; created_at: string };
  orders: { id: number; order_number: string; status: string; total: number; courier_name: string; courier_service_name: string; area_name: string; created_at: string; paid_at: string | null }[];
};

export function CustomerDetailClient() {
  const id = useSearchParams().get("id") || "";
  const router = useRouter();
  const [d, setD] = useState<CustomerDetail | null>(null);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    adminFetch<CustomerDetail>(`/api/admin/customers/${encodeURIComponent(id)}`).then(setD).catch((e) => setErr((e as Error).message));
  }, [id]);
  if (err && !d) return <Alert>{err}</Alert>;
  if (!d) return <Loading />;
  // Data uji: boleh dihapus hanya bila semua pesanannya kedaluwarsa/dibatalkan (tidak ada yang pernah dibayar).
  const deletable = d.orders.every((o) => ["expired", "cancelled"].includes(o.status));
  const paid = d.orders.filter((o) => ["paid", "processing", "shipped", "completed"].includes(o.status));
  const wa = d.customer.phone.replace(/^\+/, "");
  return (
    <>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Semua pelanggan
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{d.customer.name}</h1>
          <p className="text-sm text-slate-500">{d.customer.email} · {d.customer.phone} · pelanggan sejak {formatDateTime(d.customer.created_at)}</p>
        </div>
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
          <MessageCircle className="size-4" /> Chat WhatsApp
        </a>
        {deletable && (
          <Button
            variant="danger"
            loading={deleting}
            onClick={async () => {
              if (!window.confirm(`Hapus permanen pelanggan ${d.customer.email} beserta ${d.orders.length} pesanannya? Tidak bisa dikembalikan.`)) return;
              setDeleting(true);
              setErr("");
              try {
                await adminFetch(`/api/admin/customers/${d.customer.id}`, { method: "DELETE" });
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
      {err && <div className="mb-4"><Alert>{err}</Alert></div>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total belanja" value={formatRupiah(paid.reduce((s, o) => s + o.total, 0))} />
        <Stat label="Pesanan dibayar" value={paid.length} />
        <Stat label="Semua pesanan" value={d.orders.length} />
      </div>
      <Card title="Riwayat pesanan">
        <div className="-mx-5 -my-5 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {d.orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/order?id=${o.id}`} className="font-mono font-semibold text-slate-900 hover:underline">{o.order_number}</Link>
                    <p className="text-xs text-slate-500">{formatDateTime(o.created_at)}</p>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="hidden px-5 py-3 text-slate-600 md:table-cell">{o.area_name}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatRupiah(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
