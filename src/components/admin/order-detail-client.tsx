"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Copy, MessageCircle, RefreshCw, Trash2 } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Button, Card, inputCls, Loading, StatusBadge } from "@/components/admin/ui";
import { formatDateTime, formatRupiah, ORDER_STATUS } from "@/lib/format";

type Detail = {
  order: Record<string, string | number | null>;
  items: { id: number; name: string; unit_price: number; original_price: number | null; discount_name: string | null; quantity: number; weight_g: number }[];
  events: { type: string; message: string; actor: string | null; created_at: string }[];
  allowedNext: string[];
};

const ACTION_LABEL: Record<string, string> = {
  processing: "Tandai diproses",
  shipped: "Tandai dikirim",
  completed: "Tandai selesai",
  cancelled: "Batalkan pesanan",
};

export function OrderDetailClient() {
  const id = useSearchParams().get("id") || "";
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    adminFetch<Detail>(`/api/admin/orders/${encodeURIComponent(id)}`)
      .then((x) => {
        setD(x);
        setTracking(String(x.order.tracking_number || ""));
      })
      .catch((e) => setErr((e as Error).message));
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
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  if (err && !d) return <Alert>{err}</Alert>;
  if (!d) return <Loading />;
  const o = d.order;
  const wa = String(o.customer_phone || "").replace(/^\+/, "");
  const addressBlock = `${o.recipient_name}\n${o.recipient_phone}\n${o.address}\n${o.area_name}${o.postal_code ? ` ${o.postal_code}` : ""}`;

  return (
    <>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" /> Semua pesanan
      </Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold text-slate-900">{o.order_number}</h1>
        <StatusBadge status={String(o.status)} />
        <span className="text-sm text-slate-500">Dibuat {formatDateTime(String(o.created_at))}</span>
        {["expired", "cancelled"].includes(String(o.status)) && (
          <Button
            variant="danger"
            className="ml-auto"
            loading={busy === "delete"}
            onClick={async () => {
              if (!window.confirm(`Hapus permanen pesanan ${o.order_number}? Data pesanan, item, dan riwayatnya akan hilang dan tidak bisa dikembalikan.`)) return;
              setBusy("delete");
              setErr("");
              try {
                await adminFetch(`/api/admin/orders/${o.id}`, { method: "DELETE" });
                router.push("/admin/orders");
              } catch (e) {
                setErr((e as Error).message);
                setBusy("");
              }
            }}
          >
            <Trash2 className="size-4" /> Hapus pesanan
          </Button>
        )}
      </div>
      {err && <div className="mb-4"><Alert>{err}</Alert></div>}
      {msg && <div className="mb-4"><Alert tone="green">{msg}</Alert></div>}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
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

          <div className="grid gap-6 md:grid-cols-2">
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
            </Card>
          </div>

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
        </div>

        <div className="space-y-6">
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
        </div>
      </div>
    </>
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
