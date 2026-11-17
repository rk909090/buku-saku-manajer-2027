"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Card, Empty, inputCls, Loading, PageHeader, Pagination, StatusBadge } from "@/components/admin/ui";
import { formatDateTime, formatRupiah, ORDER_STATUS } from "@/lib/format";

type Row = {
  id: number;
  order_number: string;
  status: string;
  total: number;
  courier_name: string;
  courier_service_name: string;
  tracking_number: string | null;
  created_at: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  qty: number;
};

const TABS = ["", "paid", "processing", "shipped", "pending_payment", "completed", "cancelled", "expired"];

export function OrdersClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const status = sp.get("status") || "";
  const page = Number(sp.get("page") || 1) || 1;
  const qParam = sp.get("q") || "";
  const [q, setQ] = useState(qParam);
  const [data, setData] = useState<{ orders: Row[]; total: number; page: number; pageSize: number } | null>(null);
  const [err, setErr] = useState("");

  const query = (over: Record<string, string | number>) => {
    const p = new URLSearchParams({ ...(status && { status }), ...(qParam && { q: qParam }), page: String(page) });
    for (const [k, v] of Object.entries(over)) {
      if (v === "") p.delete(k);
      else p.set(k, String(v));
    }
    return p.toString();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset saat filter berubah
    setData(null);
    adminFetch<typeof data & object>(`/api/admin/orders?${query({})}`)
      .then(setData)
      .catch((e) => setErr((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dipicu oleh parameter URL
  }, [status, page, qParam]);

  return (
    <>
      <PageHeader
        title="Pesanan"
        subtitle="Kelola pesanan dari checkout situs"
        actions={
          <a href={`/api/admin/orders?${query({ page: "" })}&format=csv`} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50">
            <Download className="size-4" /> Ekspor CSV
          </a>
        }
      />
      <Card>
        <div className="-mx-5 -mt-5 border-b border-slate-100 px-5 pt-4">
          <div className="flex gap-1 overflow-x-auto pb-3">
            {TABS.map((t) => (
              <Link
                key={t || "all"}
                href={`/admin/orders?${query({ status: t, page: 1 })}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${status === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {t ? ORDER_STATUS[t].label : "Semua"}
              </Link>
            ))}
          </div>
          <form
            className="relative pb-4"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/admin/orders?${query({ q: q.trim(), page: 1 })}`);
            }}
          >
            <Search className="pointer-events-none absolute top-3 left-3.5 size-4 text-slate-400" />
            <input className={`${inputCls} pl-10`} placeholder="Cari no. pesanan, nama, email, WhatsApp, atau resi…" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
        </div>
        {err ? (
          <div className="pt-4"><Alert>{err}</Alert></div>
        ) : !data ? (
          <Loading />
        ) : data.orders.length === 0 ? (
          <Empty title="Tidak ada pesanan" text={qParam || status ? "Coba ubah filter atau kata kunci." : "Pesanan baru akan muncul di sini."} />
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Pesanan</th>
                  <th className="px-5 py-3">Pelanggan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="hidden px-5 py-3 lg:table-cell">Kurir</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.orders.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/admin/order?id=${o.id}`)}>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/order?id=${o.id}`} onClick={(e) => e.stopPropagation()} className="font-mono font-semibold text-slate-900 hover:underline">
                        {o.order_number}
                      </Link>
                      <p className="text-xs text-slate-500">{formatDateTime(o.created_at)} · {o.qty} buku</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{o.customer_name}</p>
                      <p className="text-xs text-slate-500">{o.customer_email}</p>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                    <td className="hidden px-5 py-3.5 text-slate-700 lg:table-cell">
                      {o.courier_name} {o.courier_service_name}
                      {o.tracking_number && <p className="font-mono text-xs text-slate-500">{o.tracking_number}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{formatRupiah(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => router.push(`/admin/orders?${query({ page: p })}`)} />
          </div>
        )}
      </Card>
    </>
  );
}
