"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, PackageCheck, RefreshCw, Truck, XCircle } from "lucide-react";
import { cart } from "@/components/shop/cart-store";
import { formatDateTime, formatRupiah, ORDER_STATUS } from "@/lib/format";
import { HomeLink } from "@/components/shop/home-link";
import { gaEvent } from "@/lib/ga";

type Status = {
  order_number: string;
  status: string;
  subtotal: number;
  discount_total: number;
  coupon_code: string | null;
  coupon_discount: number;
  shipping_cost: number;
  shipping_discount: number;
  total: number;
  courier: string;
  shipping_etd: string | null;
  recipient_name: string;
  area_name: string;
  payment_link_url: string | null;
  payment_expires_at: string | null;
  paid_at: string | null;
  tracking_number: string | null;
  created_at: string;
  items: { name: string; unit_price: number; original_price: number | null; quantity: number }[];
  shipping_info?: { notes: string[]; date: string | null; schedule_text: string | null };
};

const PAID_STATES = ["paid", "processing", "shipped", "completed"];

export function OrderStatusClient() {
  const sp = useSearchParams();
  const number = sp.get("order") || "";
  const token = sp.get("t") || "";
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const polls = useRef(0);

  async function load() {
    setChecking(true);
    try {
      const r = await fetch(`/api/shop/orders/${encodeURIComponent(number)}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(r.status === 404 ? "Pesanan tidak ditemukan. Periksa kembali tautan Anda." : j.error || "Gagal memuat status");
      setData(j);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!number || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- tautan tidak lengkap
      setError("Tautan status pesanan tidak lengkap.");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- muat sekali per tautan
  }, [number, token]);

  // Selama menunggu pembayaran: cek ulang tiap 5 detik (maks. 3 menit), server memverifikasi ke Xendit.
  useEffect(() => {
    if (data?.status !== "pending_payment") return;
    const t = setInterval(() => {
      polls.current++;
      if (polls.current > 36) return clearInterval(t);
      load();
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- interval tergantung status
  }, [data?.status]);

  // Setelah lunas: kosongkan keranjang & kirim event purchase GA4 sekali per pesanan.
  useEffect(() => {
    if (!data || !PAID_STATES.includes(data.status)) return;
    cart.clear();
    const key = `bsm_purchase_sent_${data.order_number}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* abaikan */
    }
    gaEvent("purchase", {
      transaction_id: data.order_number,
      value: data.total,
      shipping: data.shipping_cost - data.shipping_discount,
      ...(data.coupon_code ? { coupon: data.coupon_code } : {}),
      items: data.items.map((i) => ({ item_id: "buku-saku-manajer", item_name: i.name, price: i.unit_price, quantity: i.quantity })),
    });
  }, [data]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <XCircle className="mx-auto size-12 text-promo-dark" />
        <p className="mt-4 font-display text-2xl font-bold text-navy-900">{error}</p>
        <HomeLink className="mt-6 inline-block font-semibold text-navy-800 underline-offset-4 hover:underline">
          Kembali ke halaman buku
        </HomeLink>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" /> Memuat status pesanan…
      </div>
    );
  }

  const paid = PAID_STATES.includes(data.status);
  const st = ORDER_STATUS[data.status] || { label: data.status };
  const hero = paid
    ? { icon: <CheckCircle2 className="size-14 text-green-600" />, title: "Terima kasih, pembayaran diterima!", text: "Pesanan Anda kami proses. Simpan halaman ini untuk melihat status & nomor resi." }
    : data.status === "pending_payment"
      ? { icon: <Clock className="size-14 text-gold-600" />, title: "Menunggu pembayaran", text: "Selesaikan pembayaran di halaman Xendit. Status di halaman ini diperbarui otomatis." }
      : { icon: <XCircle className="size-14 text-muted" />, title: data.status === "expired" ? "Waktu pembayaran habis" : "Pesanan dibatalkan", text: "Anda bisa membuat pesanan baru kapan saja." };

  const steps = [
    { key: "paid", label: "Dibayar", icon: CheckCircle2, done: paid },
    { key: "processing", label: "Diproses", icon: PackageCheck, done: ["processing", "shipped", "completed"].includes(data.status) },
    { key: "shipped", label: "Dikirim", icon: Truck, done: ["shipped", "completed"].includes(data.status) },
    { key: "completed", label: "Selesai", icon: CheckCircle2, done: data.status === "completed" },
  ];

  return (
    <div className="mx-auto max-w-2xl pb-12">
      <div className="rounded-3xl border border-navy-900/10 bg-white p-7 text-center sm:p-10">
        <div className="flex justify-center">{hero.icon}</div>
        <h1 className="mt-4 font-display text-3xl font-bold text-navy-900">{hero.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">{hero.text}</p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-1.5 text-sm">
          <span className="text-muted">No. pesanan</span>
          <span className="font-mono font-semibold text-navy-900">{data.order_number}</span>
        </p>

        {data.status === "pending_payment" && data.payment_link_url && (
          <div className="mt-7 flex flex-col items-center gap-3">
            <a
              href={data.payment_link_url}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-400 to-gold-500 px-7 py-3.5 font-display text-lg font-semibold text-navy-950 shadow-[0_10px_30px_-8px_rgb(212_162_70/0.7)]"
            >
              Lanjutkan pembayaran {formatRupiah(data.total)}
            </a>
            {data.payment_expires_at && <p className="text-xs text-muted">Batas pembayaran: {formatDateTime(data.payment_expires_at)} WIB</p>}
            {data.shipping_info?.notes.map((n) => (
              <p key={n} className="max-w-md text-xs text-muted">
                {n}
              </p>
            ))}
            <button type="button" onClick={load} className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800">
              <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} /> Cek status sekarang
            </button>
          </div>
        )}
        {!paid && data.status !== "pending_payment" && (
          <a href="/checkout?add=buku-saku-manajer" className="mt-7 inline-flex rounded-full bg-navy-900 px-6 py-3 font-semibold text-white">
            Buat pesanan baru
          </a>
        )}
      </div>

      {paid && (
        <ol className="mt-6 grid grid-cols-4 gap-2 rounded-3xl border border-navy-900/10 bg-white p-5">
          {steps.map((s) => (
            <li key={s.key} className="flex flex-col items-center gap-1.5 text-center">
              <span className={`grid size-10 place-items-center rounded-full ${s.done ? "bg-navy-900 text-gold-400" : "bg-navy-900/5 text-muted"}`}>
                <s.icon className="size-5" />
              </span>
              <span className={`text-xs font-semibold ${s.done ? "text-navy-900" : "text-muted"}`}>{s.label}</span>
            </li>
          ))}
        </ol>
      )}

      {(data.status === "paid" || data.status === "processing") && data.shipping_info && (
        <p className="mt-4 flex gap-2 rounded-2xl bg-cream px-5 py-4 text-sm text-ink">
          <Truck className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-navy-900">Jadwal pengiriman: </strong>
            {/* Tanggal pasti (bukan "besok"), agar tetap benar bila halaman dibuka di hari berikutnya. */}
            {data.shipping_info.schedule_text || data.shipping_info.notes[0]}
          </span>
        </p>
      )}

      <div className="mt-6 rounded-3xl border border-navy-900/10 bg-white p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-navy-900">Detail Pesanan</h2>
          <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-navy-900">{st.label}</span>
        </div>
        <ul className="mt-4 divide-y divide-navy-900/10">
          {data.items.map((i, k) => (
            <li key={k} className="flex justify-between gap-4 py-3 text-[15px]">
              <span className="text-ink">
                {i.name} <span className="text-muted">× {i.quantity}</span>
              </span>
              <span className="text-right tabular-nums">
                {i.original_price != null && <s className="mr-2 text-sm text-muted">{formatRupiah(i.original_price * i.quantity)}</s>}
                <span className="font-semibold">{formatRupiah(i.unit_price * i.quantity)}</span>
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-2 border-t border-navy-900/10 pt-4 text-[15px]">
          {data.coupon_discount > 0 && <Row k={`Kupon ${data.coupon_code}`} v={<span className="text-emerald-700">−{formatRupiah(data.coupon_discount)}</span>} />}
          <Row k="Ongkos kirim" v={formatRupiah(data.shipping_cost)} />
          {data.shipping_discount > 0 && <Row k={`Potongan ongkir (${data.coupon_code})`} v={<span className="text-emerald-700">−{formatRupiah(data.shipping_discount)}</span>} />}
          <Row k="Total" v={<span className="font-display text-xl font-bold text-navy-900">{formatRupiah(data.total)}</span>} />
        </dl>
        <dl className="mt-5 grid gap-3 rounded-2xl bg-cream p-4 text-sm sm:grid-cols-2">
          <Info k="Penerima" v={data.recipient_name} />
          <Info k="Tujuan" v={data.area_name} />
          <Info k="Kurir" v={`${data.courier}${data.shipping_etd ? ` (${data.shipping_etd})` : ""}`} />
          <Info k="No. resi" v={data.tracking_number || "Menunggu pengiriman"} />
          <Info k="Dipesan" v={`${formatDateTime(data.created_at)} WIB`} />
          {data.paid_at && <Info k="Dibayar" v={`${formatDateTime(data.paid_at)} WIB`} />}
        </dl>
      </div>
      <p className="mt-6 text-center text-sm">
        <HomeLink className="font-semibold text-navy-800 underline-offset-4 hover:underline">
          Kembali ke halaman buku
        </HomeLink>
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className="font-semibold tabular-nums">{v}</dd>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="font-semibold text-navy-900">{v}</dd>
    </div>
  );
}
