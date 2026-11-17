"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Package, ShoppingBag, Users, Wallet } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Card, Empty, Loading, PageHeader, Stat, StatusBadge } from "@/components/admin/ui";
import { formatDateTime, formatRupiah } from "@/lib/format";

type Overview = {
  totals: Record<string, number>;
  customers: number;
  byStatus: Record<string, number>;
  daily: { day: string; orders: number; revenue: number }[];
  recent: { id: number; order_number: string; status: string; total: number; created_at: string; customer_name: string }[];
  setup: { integrations: { biteship: string; xendit: string; xenditWebhook: string }; shipping: { ok: boolean; reason: string } };
};

export function OverviewClient() {
  const [d, setD] = useState<(Overview & { fetchedAt: number }) | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    adminFetch<Overview>("/api/admin/overview").then((j) => setD({ ...j, fetchedAt: Date.now() })).catch((e) => setErr((e as Error).message));
  }, []);
  if (err) return <Alert>{err}</Alert>;
  if (!d) return <Loading />;

  // 14 hari terakhir (WIB), isi 0 untuk hari tanpa penjualan.
  const days = [...Array(14)].map((_, i) => {
    const dt = new Date(d.fetchedAt + 7 * 3600e3 - (13 - i) * 86400e3);
    const key = dt.toISOString().slice(0, 10);
    const row = d.daily.find((x) => String(x.day).slice(0, 10) === key);
    return { key, label: dt.getUTCDate(), revenue: row?.revenue || 0, orders: row?.orders || 0 };
  });
  const max = Math.max(1, ...days.map((x) => x.revenue));

  const checks = [
    { ok: d.setup.integrations.xendit !== "missing", label: `Xendit secret key${d.setup.integrations.xendit === "test" ? " (mode TEST)" : ""}`, fix: "Isi XENDIT_SECRET_KEY di hPanel" },
    { ok: d.setup.integrations.xenditWebhook !== "missing", label: "Token webhook Xendit", fix: "Isi XENDIT_WEBHOOK_TOKEN di hPanel" },
    { ok: d.setup.integrations.biteship !== "missing", label: `Biteship API key${d.setup.integrations.biteship === "test" ? " (mode TEST)" : ""}`, fix: "Isi BITESHIP_API_KEY di hPanel" },
    { ok: d.setup.shipping.ok, label: "Asal pengiriman, kurir & berat produk", fix: d.setup.shipping.reason, href: d.setup.shipping.reason.includes("Berat") ? "/admin/products" : "/admin/settings" },
  ];
  const allOk = checks.every((c) => c.ok);

  return (
    <>
      <PageHeader title="Ringkasan" subtitle="Penjualan Buku Saku Manajer dari checkout situs" />

      {!allOk && (
        <Card title="Persiapan toko" className="mb-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                {c.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />}
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">{c.label}</p>
                  {!c.ok &&
                    (c.href ? (
                      <Link href={c.href} className="text-slate-600 underline underline-offset-2">
                        {c.fix}
                      </Link>
                    ) : (
                      <p className="text-slate-600">{c.fix}</p>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Pendapatan 30 hari" value={formatRupiah(d.totals.revenue_30d)} sub={`7 hari: ${formatRupiah(d.totals.revenue_7d)}`} icon={<Wallet className="size-5" />} />
        <Stat label="Pesanan dibayar 30 hari" value={d.totals.paid_orders_30d} sub={`Total semua waktu: ${d.totals.paid_orders}`} icon={<ShoppingBag className="size-5" />} />
        <Stat label="Perlu diproses" value={d.totals.to_process} sub="Status: dibayar, belum diproses" icon={<Package className="size-5" />} />
        <Stat label="Pelanggan" value={d.customers} sub={`Pendapatan total: ${formatRupiah(d.totals.revenue_all)}`} icon={<Users className="size-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Pendapatan 14 hari terakhir">
          <div className="flex h-48 items-end gap-1.5" role="img" aria-label="Grafik pendapatan harian 14 hari terakhir">
            {days.map((x) => (
              <div key={x.key} className="group flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-slate-900 transition group-hover:bg-amber-500"
                    style={{ height: `${Math.max(2, (x.revenue / max) * 100)}%`, opacity: x.revenue ? 1 : 0.15 }}
                    title={`${x.key}: ${formatRupiah(x.revenue)} (${x.orders} pesanan)`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 tabular-nums">{x.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Status pesanan">
          <ul className="space-y-2.5">
            {["pending_payment", "paid", "processing", "shipped", "completed", "expired", "cancelled"].map((s) => (
              <li key={s} className="flex items-center justify-between">
                <StatusBadge status={s} />
                <Link href={`/admin/orders?status=${s}`} className="text-sm font-semibold text-slate-900 tabular-nums hover:underline">
                  {d.byStatus[s] || 0}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Pesanan terbaru" className="mt-6" action={<Link href="/admin/orders" className="text-sm font-semibold text-slate-700 hover:underline">Lihat semua</Link>}>
        {d.recent.length === 0 ? (
          <Empty title="Belum ada pesanan" text="Pesanan dari checkout situs akan muncul di sini." />
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {d.recent.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/order?id=${o.id}`} className="font-mono font-semibold text-slate-900 hover:underline">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{o.customer_name}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{formatRupiah(o.total)}</td>
                    <td className="hidden px-5 py-3 text-right text-slate-500 md:table-cell">{formatDateTime(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
