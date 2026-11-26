"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, MessageCircle, RefreshCw, Trash2, X } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Badge, Button, Card, inputCls, Loading, StatusBadge } from "@/components/admin/ui";
import { classifyChannel, sanitizeTouch, sourceLabel, type Touch } from "@/lib/attribution";
import { formatDateTime, formatRupiah, ORDER_STATUS } from "@/lib/format";
import { adminShipLabel, cutoffLabel, formatShipDate, shipScheduleFor, type ShipConfig } from "@/lib/shop/shipping-schedule";

type Detail = {
  order: Record<string, string | number | null>;
  items: { id: number; name: string; unit_price: number; original_price: number | null; discount_name: string | null; quantity: number; weight_g: number }[];
  events: { type: string; message: string; actor: string | null; created_at: string }[];
  allowedNext: string[];
  shipConfig?: ShipConfig;
};

const ACTION_LABEL: Record<string, string> = {
  processing: "Tandai diproses",
  shipped: "Tandai dikirim",
  completed: "Tandai selesai",
  cancelled: "Batalkan pesanan",
};

/** Halaman penuh /admin/order?id=… */
export function OrderDetailClient() {
  const id = useSearchParams().get("id") || "";
  const router = useRouter();
  return <OrderDetailView orderId={id} onDeleted={() => router.push("/admin/orders")} />;
}

type PanelNav = { onPrev?: () => void; onNext?: () => void; position?: string };

/**
 * Detail pesanan. `panel` = disematkan di halaman lain (mis. detail pelanggan): satu kolom, tombol tutup,
 * tanpa kartu "Pelanggan" (sudah terlihat di halaman induk). Tindakan (status, resi, catatan, hapus) sama persis.
 */
export function OrderDetailView({
  orderId,
  panel,
  onClose,
  onChanged,
  onDeleted,
  nav,
}: {
  orderId: string;
  panel?: boolean;
  onClose?: () => void;
  /** Dipanggil setelah pesanan berubah (status, resi, catatan) agar halaman induk ikut diperbarui. */
  onChanged?: () => void;
  onDeleted?: () => void;
  nav?: PanelNav;
}) {
  const id = orderId;
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    // Pesanan lain dipilih: kosongkan tampilan lama agar data tidak tertukar.
    /* eslint-disable react-hooks/set-state-in-effect -- reset saat pesanan yang ditampilkan berganti */
    setD(null);
    setErr("");
    setMsg("");
    setNote("");
    /* eslint-enable react-hooks/set-state-in-effect */
    adminFetch<Detail>(`/api/admin/orders/${encodeURIComponent(id)}`)
      .then((x) => {
        if (!alive) return;
        setD(x);
        setTracking(String(x.order.tracking_number || ""));
      })
      .catch((e) => alive && setErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [id]);

  async function act(body: Record<string, unknown>, key: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setErr("");
    setMsg("");
    try {
      const x = await adminFetch<Detail>(`/api/admin/orders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
      setD(x);
      setTracking(String(x.order.tracking_number || ""));
      setMsg("Tersimpan");
      if (body.action === "note") setNote("");
      onChanged?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  if (!d)
    return panel ? (
      <PanelFrame title={err ? "Pesanan" : "Memuat…"} onClose={onClose} nav={nav}>
        {err ? <Alert>{err}</Alert> : <Loading />}
      </PanelFrame>
    ) : err ? (
      <Alert>{err}</Alert>
    ) : (
      <Loading />
    );
  const o = d.order;
  const wa = String(o.customer_phone || "").replace(/^\+/, "");
  const addressBlock = `${o.recipient_name}\n${o.recipient_phone}\n${o.address}\n${o.area_name}${o.postal_code ? ` ${o.postal_code}` : ""}`;

  const deletable = ["expired", "cancelled"].includes(String(o.status));
  const deleteButton = (
    <Button
      variant="danger"
      className={panel ? "" : "ml-auto"}
      loading={busy === "delete"}
      onClick={async () => {
        if (!window.confirm(`Hapus permanen pesanan ${o.order_number}? Data pesanan, item, dan riwayatnya akan hilang dan tidak bisa dikembalikan.`)) return;
        setBusy("delete");
        setErr("");
        try {
          await adminFetch(`/api/admin/orders/${o.id}`, { method: "DELETE" });
          onDeleted?.();
        } catch (e) {
          setErr((e as Error).message);
          setBusy("");
        }
      }}
    >
      <Trash2 className="size-4" /> Hapus pesanan
    </Button>
  );
  const alerts = (
    <>
      {err && <Alert>{err}</Alert>}
      {msg && <Alert tone="green">{msg}</Alert>}
    </>
  );
  const itemsCard = (
    <Card title="Item">
      <ul className="divide-y divide-slate-100">
        {d.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-4 py-3 text-sm first:pt-0">
            <span>
              <span className="font-medium text-slate-900">{i.name}</span>
              <span className="block text-xs text-slate-500">
                {i.original_price != null && <s className="mr-1">{formatRupiah(i.original_price)}</s>}
                {formatRupiah(i.unit_price)} × {i.quantity} · {i.weight_g * i.quantity} g
                {i.discount_name && <span className="ml-1 text-rose-700">· {i.discount_name}</span>}
              </span>
            </span>
            <span className="font-semibold tabular-nums">{formatRupiah(i.unit_price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
        <Line k="Subtotal" v={formatRupiah(Number(o.subtotal))} />
        {Number(o.coupon_discount) > 0 && <Line k={`Kupon ${o.coupon_code}`} v={<span className="text-emerald-700">−{formatRupiah(Number(o.coupon_discount))}</span>} />}
        <Line k={`Ongkir (${o.courier_name} ${o.courier_service_name})`} v={formatRupiah(Number(o.shipping_cost))} />
        {Number(o.shipping_discount) > 0 && (
          <Line k={`Potongan ongkir (kupon ${o.coupon_code})`} v={<span className="text-emerald-700">−{formatRupiah(Number(o.shipping_discount))}</span>} />
        )}
        <Line k="Total" v={<span className="text-base font-bold">{formatRupiah(Number(o.total))}</span>} />
      </dl>
    </Card>
  );
  const customerCard = (
    <Card title="Pelanggan">
      <p className="font-semibold text-slate-900">
        <Link href={`/admin/customer?id=${o.customer_id}`} className="hover:underline">{o.customer_name}</Link>
      </p>
      <p className="mt-1 text-sm text-slate-600">{o.customer_email}</p>
      <p className="text-sm text-slate-600">{o.customer_phone}</p>
      {wa && (
        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
          <MessageCircle className="size-4" /> Chat WhatsApp
        </a>
      )}
      {o.ab_variant && <p className="mt-3 text-xs text-slate-500">Varian headline saat memesan: <b>{String(o.ab_variant).toUpperCase()}</b></p>}
    </Card>
  );
  const shippingCard = (
    <Card
      title="Pengiriman"
      action={
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(addressBlock).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Tersalin" : "Salin alamat"}
        </button>
      }
    >
      <p className="font-semibold text-slate-900">{o.recipient_name}</p>
      <p className="text-sm text-slate-600">{o.recipient_phone}</p>
      <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{o.address}</p>
      <p className="text-sm text-slate-700">{o.area_name}{o.postal_code ? ` ${o.postal_code}` : ""}</p>
      {o.notes && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Catatan: {o.notes}</p>}
      <p className="mt-3 text-sm text-slate-600">
        {o.courier_name} {o.courier_service_name}
        {o.shipping_etd ? ` · ${o.shipping_etd}` : ""}
      </p>
      {(o.status === "paid" || o.status === "processing") && o.paid_at && d.shipConfig && (
        <ShipPlan paidAt={String(o.paid_at)} cfg={d.shipConfig} />
      )}
    </Card>
  );
  const paymentCard = (
    <Card title="Pembayaran (Xendit)">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Info k="Status" v={ORDER_STATUS[String(o.status)]?.label || String(o.status)} />
        <Info k="Dibayar" v={o.paid_at ? formatDateTime(String(o.paid_at)) : "—"} />
        <Info k="Payment session" v={String(o.xendit_session_id || "—")} mono />
        <Info k="Payment ID" v={String(o.xendit_payment_id || "—")} mono />
        <Info k="Batas bayar" v={o.payment_expires_at ? formatDateTime(String(o.payment_expires_at)) : "—"} />
      </dl>
      {o.status === "pending_payment" && o.xendit_session_id && (
        <Button variant="secondary" className="mt-4" loading={busy === "recheck"} onClick={() => act({ action: "recheck_payment" }, "recheck")}>
          <RefreshCw className="size-4" /> Cek ulang status ke Xendit
        </Button>
      )}
    </Card>
  );
  const sourceCard = <SourceCard o={o} />;
  const actionsCard = (
    <Card title="Tindakan">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="resi">No. resi</label>
          <div className="flex gap-2">
            <input id="resi" className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Isi setelah paket diserahkan ke kurir" />
            <Button variant="secondary" disabled={tracking.trim().length < 3 || tracking === (o.tracking_number || "")} loading={busy === "tracking"} onClick={() => act({ action: "tracking", tracking_number: tracking.trim() }, "tracking")}>
              Simpan
            </Button>
          </div>
        </div>
        {d.allowedNext.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {d.allowedNext.map((s) => (
              <Button
                key={s}
                variant={s === "cancelled" ? "danger" : "primary"}
                loading={busy === s}
                onClick={() =>
                  act(
                    { action: "status", status: s, ...(s === "shipped" && tracking.trim() ? { tracking_number: tracking.trim() } : {}) },
                    s,
                    s === "cancelled"
                      ? `Batalkan pesanan ${o.order_number}?${["paid", "processing"].includes(String(o.status)) ? "\n\nPesanan ini SUDAH DIBAYAR. Pengembalian dana harus dilakukan manual di dashboard Xendit." : ""}`
                      : undefined
                  )
                }
              >
                {ACTION_LABEL[s]}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Tidak ada perubahan status yang tersedia untuk pesanan ini.</p>
        )}
        <div className="border-t border-slate-100 pt-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="note">Catatan internal</label>
          <textarea id="note" rows={2} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} />
          <Button variant="secondary" className="mt-2" disabled={!note.trim()} loading={busy === "note"} onClick={() => act({ action: "note", note: note.trim() }, "note")}>
            Tambah catatan
          </Button>
        </div>
      </div>
    </Card>
  );
  const historyCard = (
    <Card title="Riwayat">
      <ol className="relative space-y-4 border-l border-slate-200 pl-5">
        {d.events.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-slate-900 ring-4 ring-white" />
            <p className="text-sm text-slate-800">{e.message}</p>
            <p className="text-xs text-slate-500">
              {formatDateTime(e.created_at)}
              {e.actor ? ` · ${e.actor}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );

  if (panel) {
    // Panel: urutan menurut kebutuhan kerja — tindakan & isi pesanan dulu, lalu pengiriman, pembayaran, riwayat.
    return (
      <PanelFrame
        title={String(o.order_number)}
        status={String(o.status)}
        subtitle={`Dibuat ${formatDateTime(String(o.created_at))}`}
        onClose={onClose}
        nav={nav}
        fullHref={`/admin/order?id=${o.id}`}
      >
        <div className="space-y-4">
          {(err || msg) && <div className="space-y-2">{alerts}</div>}
          {actionsCard}
          {itemsCard}
          {shippingCard}
          {paymentCard}
          {sourceCard}
          {historyCard}
          {deletable && <div className="flex justify-end">{deleteButton}</div>}
        </div>
      </PanelFrame>
    );
  }

  return (
    <>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Semua pesanan
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold text-slate-900">{o.order_number}</h1>
        <StatusBadge status={String(o.status)} />
        <span className="text-sm text-slate-500">Dibuat {formatDateTime(String(o.created_at))}</span>
        {deletable && deleteButton}
      </div>
      {(err || msg) && <div className="mb-4 space-y-2">{alerts}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {itemsCard}
          <div className="grid gap-6 md:grid-cols-2">
            {customerCard}
            {shippingCard}
          </div>
          {paymentCard}
          {sourceCard}
        </div>
        <div className="space-y-6">
          {actionsCard}
          {historyCard}
        </div>
      </div>
    </>
  );
}

/** Bingkai panel detail: kepala menempel (judul, navigasi antarpesanan, buka halaman penuh, tutup). */
function PanelFrame({
  title,
  status,
  subtitle,
  onClose,
  nav,
  fullHref,
  children,
}: {
  title: string;
  status?: string;
  subtitle?: string;
  onClose?: () => void;
  nav?: PanelNav;
  fullHref?: string;
  children: React.ReactNode;
}) {
  const iconBtn = "grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <section aria-label={`Detail pesanan ${title}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      {/* Ponsel: menempel di bawah bilah atas aplikasi (h-16); desktop: di puncak area gulir panel. */}
      <header className="sticky top-16 z-10 flex items-start gap-3 rounded-t-2xl border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:top-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-mono text-base font-bold text-slate-900">{title}</h2>
            {status && <StatusBadge status={status} />}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}{nav?.position ? ` · ${nav.position}` : ""}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {nav && (
            <>
              <button type="button" className={iconBtn} onClick={nav.onPrev} disabled={!nav.onPrev} aria-label="Pesanan sebelumnya (lebih baru)" title="Pesanan sebelumnya">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" className={iconBtn} onClick={nav.onNext} disabled={!nav.onNext} aria-label="Pesanan berikutnya (lebih lama)" title="Pesanan berikutnya">
                <ChevronRight className="size-4" />
              </button>
            </>
          )}
          {fullHref && (
            <Link href={fullHref} className={iconBtn} aria-label="Buka di halaman penuh" title="Buka di halaman penuh">
              <ExternalLink className="size-4" />
            </Link>
          )}
          {onClose && (
            <button type="button" className={iconBtn} onClick={onClose} aria-label="Tutup detail pesanan" title="Tutup (Esc)">
              <X className="size-4" />
            </button>
          )}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Sumber pesanan (UTM/perujuk) — tersimpan sejak 26 Nov 2026; pesanan lama tampil "belum tercatat". */
function SourceCard({ o }: { o: Record<string, string | number | null> }) {
  let first: Touch | null = null;
  let last: Touch | null = null;
  try {
    const a = o.attribution ? JSON.parse(String(o.attribution)) : null;
    first = sanitizeTouch(a?.first);
    last = sanitizeTouch(a?.last);
  } catch {
    /* JSON rusak → tampilkan kolom saja */
  }
  const has = !!o.channel;
  const v = (x: unknown) => (x == null || x === "" ? "—" : String(x));
  return (
    <Card title="Sumber pesanan" action={has ? <Badge tone="violet">{String(o.channel)}</Badge> : undefined}>
      {!has ? (
        <p className="text-sm text-slate-500">Belum tercatat — pesanan dibuat sebelum pencatatan sumber aktif (26 Nov 2026).</p>
      ) : (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Info k="utm_source" v={v(o.utm_source)} />
            <Info k="utm_medium" v={v(o.utm_medium)} />
            <Info k="utm_campaign" v={v(o.utm_campaign)} />
            <Info k="utm_content" v={v(o.utm_content)} />
            <Info k="utm_term" v={v(o.utm_term)} />
            <Info k="ID klik iklan" v={v(o.click_id_type)} />
            <Info k="Perujuk" v={v(o.referrer_host)} />
            <Info k="Halaman pendaratan" v={v(o.landing_path)} />
          </dl>
          {first && last && first.ts !== last.ts && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Kunjungan pertama: <b>{classifyChannel(first)}</b> ({sourceLabel(first)}
              {first.campaign ? ` · ${first.campaign}` : ""}) pada {formatDateTime(new Date(first.ts).toISOString())}
            </p>
          )}
          {o.session_id && (
            <p className="mt-2 text-xs text-slate-500">
              Perjalanan pembeli bisa dilihat di{" "}
              <Link href="/admin/journey" className="font-semibold text-slate-700 underline underline-offset-2">
                Perjalanan Pengunjung
              </Link>
              .
            </p>
          )}
        </>
      )}
    </Card>
  );
}

/** Jadwal kirim pesanan lunas menurut jam batas & libur di Pengaturan. */
function ShipPlan({ paidAt, cfg }: { paidAt: string; cfg: ShipConfig }) {
  const s = shipScheduleFor(paidAt, cfg);
  const l = adminShipLabel(s.date);
  const why = s.holiday
    ? `Libur pengiriman${s.holiday.label ? ` (${s.holiday.label})` : ""}`
    : s.afterCutoff
      ? `Dibayar di atas pukul ${cutoffLabel(cfg.cutoff)}`
      : `Dibayar sebelum pukul ${cutoffLabel(cfg.cutoff)}`;
  const box = { green: "bg-emerald-50 text-emerald-900", blue: "bg-sky-50 text-sky-900", amber: "bg-amber-50 text-amber-900", red: "bg-rose-50 text-rose-900" }[l.tone];
  return (
    <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${box}`}>
      <p className="font-semibold">{l.text}</p>
      <p className="text-xs opacity-80">
        Jadwal: {formatShipDate(s.date)} · {why}
      </p>
    </div>
  );
}

function Line({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-semibold tabular-nums">{v}</dd>
    </div>
  );
}
function Info({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className={`font-medium break-all text-slate-900 ${mono ? "font-mono text-xs" : ""}`}>{v}</dd>
    </div>
  );
}
