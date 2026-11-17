"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Badge, Card, Loading, PageHeader } from "@/components/admin/ui";
import { formatDateTime, formatRupiah } from "@/lib/format";

type V = {
  variant: string;
  views: number;
  visitors: number;
  clicks: number;
  clickers: number;
  conversion_rate: number;
  vs_control: null | { uplift: number | null; p_value: number | null; significant_95?: boolean; enough_data: boolean };
};
type Resp = {
  stats: {
    first_event: string | null;
    last_event: string | null;
    preview_events_excluded: number | null;
    variants: V[];
    orders_by_variant: { variant: string; orders: number; paid_orders: number; revenue: number }[];
  };
  variants: { id: string; name: string; kicker: string; headline: string }[];
};

const pct = (n: number | null | undefined) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);

export function AbClient() {
  const [d, setD] = useState<Resp | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    adminFetch<Resp>("/api/admin/ab").then(setD).catch((e) => setErr((e as Error).message));
  }, []);
  if (err) return <Alert>{err}</Alert>;
  if (!d) return <Loading />;
  return (
    <>
      <PageHeader
        title="Analitik A/B headline"
        subtitle={`Data ${formatDateTime(d.stats.first_event)} – ${formatDateTime(d.stats.last_event)} · pratinjau internal dikecualikan (${d.stats.preview_events_excluded || 0} event)`}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {d.stats.variants.map((v) => {
          const meta = d.variants.find((x) => x.id === v.variant);
          const ord = d.stats.orders_by_variant.find((o) => o.variant === v.variant);
          const isControl = v.variant === "a";
          return (
            <Card key={v.variant} title={<span>Varian {v.variant.toUpperCase()} {isControl && <Badge>Kontrol</Badge>}</span>}>
              <p className="text-xs text-slate-500">{meta?.kicker}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{meta?.headline}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <M k="Pengunjung unik" v={v.visitors} />
                <M k="Klik beli (unik)" v={v.clickers} />
                <M k="Konversi klik" v={pct(v.conversion_rate)} strong />
                <M k="Uplift vs A" v={isControl ? "—" : pct(v.vs_control?.uplift)} />
                <M k="Pesanan dibayar" v={ord?.paid_orders ?? 0} />
                <M k="Pendapatan" v={formatRupiah(ord?.revenue ?? 0)} />
              </dl>
              {!isControl && v.vs_control && (
                <p className="mt-4 text-xs text-slate-500">
                  {v.vs_control.enough_data
                    ? v.vs_control.significant_95
                      ? `Signifikan secara statistik (p = ${v.vs_control.p_value}).`
                      : `Belum signifikan (p = ${v.vs_control.p_value}).`
                    : "Data belum cukup (min. 100 pengunjung per varian & 20 klik)."}
                </p>
              )}
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Konversi klik = pengunjung unik yang mengklik tombol beli ÷ pengunjung unik yang melihat headline. Pesanan dibayar diatribusikan ke varian yang dilihat saat pesanan dibuat.
      </p>
    </>
  );
}

function M({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className={`mt-0.5 tabular-nums ${strong ? "text-lg font-bold text-slate-900" : "font-semibold text-slate-800"}`}>{v}</dd>
    </div>
  );
}
