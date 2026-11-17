"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, Lock, Minus, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import { cart, useCart } from "@/components/shop/cart-store";
import { AreaCombobox, type AreaValue } from "@/components/shop/area-combobox";
import { formatRupiah } from "@/lib/format";
import { HomeLink } from "@/components/shop/home-link";
import { CheckoutUnavailable } from "@/components/shop/checkout-unavailable";
import { BOOK_ITEM, gaEvent } from "@/lib/ga";

type Product = { slug: string; name: string; price: number; image_url: string | null; available: boolean; stock: number | null };
type Catalog = { products: Product[]; maxQty: number; checkout: { ready: boolean; reason: string } };
type Rate = {
  courier_code: string;
  courier_service_code: string;
  courier_name: string;
  courier_service_name: string;
  description: string;
  price: number;
  etd: string;
};

type Form = {
  name: string;
  email: string;
  phone: string;
  sameRecipient: boolean;
  recipientName: string;
  recipientPhone: string;
  area: AreaValue | null;
  address: string;
  notes: string;
};
const EMPTY_FORM: Form = { name: "", email: "", phone: "", sameRecipient: true, recipientName: "", recipientPhone: "", area: null, address: "", notes: "" };
const FORM_KEY = "bsm_checkout_v1";

const input =
  "w-full rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 transition outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-400/20 aria-[invalid=true]:border-promo-dark aria-[invalid=true]:ring-promo/10";

const PHONE_RE = /^(\+?62|0)8\d{7,12}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f: Form) {
  const e: Partial<Record<keyof Form | "courier", string>> = {};
  if (f.name.trim().length < 2) e.name = "Isi nama lengkap";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Email tidak valid";
  else if (f.email.trim().length > 50) e.email = "Email maksimal 50 karakter";
  if (!PHONE_RE.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Nomor WhatsApp tidak valid (contoh 0812xxxxxxx)";
  if (!f.sameRecipient) {
    if (f.recipientName.trim().length < 2) e.recipientName = "Isi nama penerima";
    if (!PHONE_RE.test(f.recipientPhone.replace(/[\s-]/g, ""))) e.recipientPhone = "Nomor penerima tidak valid";
  }
  if (!f.area) e.area = "Pilih kecamatan / kota tujuan dari daftar";
  if (f.address.trim().length < 10) e.address = "Tulis alamat lengkap (jalan, nomor, RT/RW, patokan)";
  return e;
}

export function CheckoutClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const lines = useCart();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState("");
  const [courier, setCourier] = useState<string>("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const loaded = useRef(false);
  const gaBegin = useRef(false);

  // ?add=slug dari tombol "Beli Sekarang": pastikan ada di keranjang, lalu bersihkan URL.
  useEffect(() => {
    const add = sp.get("add");
    if (add && /^[a-z0-9-]{1,64}$/.test(add)) {
      cart.ensure(add);
      router.replace("/checkout", { scroll: false });
    }
  }, [sp, router]);

  useEffect(() => {
    fetch("/api/shop/catalog")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Toko belum siap");
        setCatalog(j);
      })
      .catch((e) => setCatalogError((e as Error).message));
  }, []);

  // Simpan & pulihkan isian form (hanya di browser ini).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FORM_KEY) || "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pulihkan data dari localStorage sekali saat mount
      if (saved && typeof saved === "object") setForm({ ...EMPTY_FORM, ...saved });
    } catch {
      /* abaikan */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {
      /* abaikan */
    }
  }, [form]);

  const products = useMemo(() => new Map((catalog?.products || []).map((p) => [p.slug, p])), [catalog]);
  const items = lines.filter((l) => products.has(l.slug)).map((l) => ({ ...l, product: products.get(l.slug)! }));
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const selectedRate = rates?.find((r) => `${r.courier_code}|${r.courier_service_code}` === courier) || null;
  const total = subtotal + (selectedRate?.price || 0);
  const linesKey = JSON.stringify(items.map((i) => [i.slug, i.qty]));
  const gaItems = items.map((i) => ({ ...BOOK_ITEM(i.product.price, i.qty), item_id: i.slug, item_name: i.product.name }));

  useEffect(() => {
    if (!catalog || gaBegin.current || items.length === 0) return;
    gaBegin.current = true;
    gaEvent("begin_checkout", { value: subtotal, items: gaItems });
  }, [catalog, items.length, subtotal, gaItems]);

  // Ambil ongkir saat area / isi keranjang berubah.
  useEffect(() => {
    if (!form.area || items.length === 0 || !catalog?.checkout.ready) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pilihan saat syarat ongkir belum terpenuhi
      setRates(null);
      return;
    }
    let cancelled = false;
    setRatesLoading(true);
    setRatesError("");
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/shop/rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ areaId: form.area!.id, lines: items.map((i) => ({ slug: i.slug, qty: i.qty })) }),
        });
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) throw new Error(j.error || "Gagal menghitung ongkir");
        setRates(j.options);
        setCourier((c) => (j.options.some((o: Rate) => `${o.courier_code}|${o.courier_service_code}` === c) ? c : ""));
      } catch (e) {
        if (!cancelled) {
          setRates([]);
          setRatesError((e as Error).message);
        }
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- linesKey merangkum isi keranjang
  }, [form.area?.id, linesKey, catalog?.checkout.ready]);

  const errors = validate(form);
  const show = (k: keyof Form) => (submitted || touched[k]) && errors[k];
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: keyof Form) => () => setTouched((t) => ({ ...t, [k]: true }));

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setPayError("");
    if (Object.keys(errors).length) {
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    if (!selectedRate) {
      setPayError("Pilih kurir pengiriman terlebih dahulu");
      document.getElementById("pengiriman")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setPaying(true);
    try {
      const r = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: items.map((i) => ({ slug: i.slug, qty: i.qty })),
          customer: { name: form.name, email: form.email, phone: form.phone },
          shipping: {
            recipientName: form.sameRecipient ? form.name : form.recipientName,
            recipientPhone: form.sameRecipient ? form.phone : form.recipientPhone,
            address: form.address,
            areaId: form.area!.id,
            areaName: form.area!.name,
            postalCode: form.area!.postal_code,
            notes: form.notes.trim() || null,
          },
          courier: { code: selectedRate.courier_code, serviceCode: selectedRate.courier_service_code },
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal membuat pesanan");
      gaEvent("add_payment_info", { value: j.total, items: gaItems, payment_type: "xendit" });
      try {
        localStorage.setItem("bsm_last_order", JSON.stringify({ number: j.orderNumber, token: j.token }));
      } catch {
        /* abaikan */
      }
      window.location.assign(j.paymentLinkUrl);
    } catch (err) {
      setPayError((err as Error).message);
      setPaying(false);
    }
  }

  /* ───────────── Tampilan ───────────── */

  if (catalogError) return <CheckoutUnavailable />;
  if (!catalog) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="mr-2 size-5 animate-spin" /> Memuat keranjang…
      </div>
    );
  }
  if (!catalog.checkout.ready) return <CheckoutUnavailable />;
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="font-display text-3xl font-bold text-navy-900">Keranjang masih kosong</p>
        <p className="mt-3 text-muted">Tambahkan Buku Saku Manajer ke keranjang untuk mulai memesan.</p>
        <a
          href="/checkout?add=buku-saku-manajer"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 font-display font-semibold text-navy-950 hover:bg-gold-400"
        >
          Tambahkan Buku Saku Manajer
        </a>
        <p className="mt-6">
          <HomeLink className="text-sm font-semibold text-navy-800 underline-offset-4 hover:underline">
            Kembali ke halaman buku
          </HomeLink>
        </p>
      </div>
    );
  }

  const summary = (
    <div className="rounded-3xl border border-navy-900/10 bg-white p-6 shadow-[0_8px_30px_-12px_rgb(12_24_48/0.18)]">
      <h2 className="font-display text-xl font-bold text-navy-900">Ringkasan Pesanan</h2>
      <ul className="mt-5 space-y-4">
        {items.map((i) => (
          <li key={i.slug} className="flex gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- gambar statis kecil dari /public */}
            <img src={i.product.image_url || "/images/bsm-cover.png"} alt="" className="h-20 w-auto shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="leading-snug font-semibold text-navy-900">{i.product.name}</p>
              <p className="mt-0.5 text-sm text-muted">{formatRupiah(i.product.price)}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center rounded-full border border-navy-900/15">
                  <button
                    type="button"
                    aria-label="Kurangi jumlah"
                    onClick={() => cart.setQty(i.slug, i.qty - 1, catalog.maxQty)}
                    className="grid size-8 place-items-center rounded-full text-navy-900 hover:bg-cream disabled:opacity-40"
                    disabled={i.qty <= 1}
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                    {i.qty}
                  </span>
                  <button
                    type="button"
                    aria-label="Tambah jumlah"
                    onClick={() => cart.setQty(i.slug, i.qty + 1, catalog.maxQty)}
                    className="grid size-8 place-items-center rounded-full text-navy-900 hover:bg-cream disabled:opacity-40"
                    disabled={i.qty >= catalog.maxQty || (i.product.stock != null && i.qty >= i.product.stock)}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => cart.setQty(i.slug, 0)}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-promo-dark"
                >
                  <Trash2 className="size-3.5" /> Hapus
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-6 space-y-2.5 border-t border-navy-900/10 pt-5 text-[15px]">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="font-semibold text-ink tabular-nums">{formatRupiah(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Ongkos kirim</dt>
          <dd className="font-semibold text-ink tabular-nums">
            {selectedRate ? formatRupiah(selectedRate.price) : <span className="text-muted">Pilih kurir</span>}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-navy-900/10 pt-3">
          <dt className="font-semibold text-navy-900">Total</dt>
          <dd className="font-display text-2xl font-bold text-navy-900 tabular-nums">{formatRupiah(total)}</dd>
        </div>
      </dl>
      {payError && (
        <p role="alert" className="mt-4 flex gap-2 rounded-xl bg-promo/[0.07] p-3 text-sm text-promo-dark">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {payError}
        </p>
      )}
      <button
        type="submit"
        form="checkout-form"
        disabled={paying || !catalog.checkout.ready}
        className="mt-5 hidden w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-gold-400 to-gold-500 px-6 py-4 font-display text-lg font-semibold text-navy-950 shadow-[0_10px_30px_-8px_rgb(212_162_70/0.7)] transition hover:from-gold-300 hover:to-gold-400 disabled:cursor-not-allowed disabled:opacity-60 lg:flex"
      >
        {paying ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-5" />}
        {paying ? "Menyiapkan pembayaran…" : `Bayar ${formatRupiah(total)}`}
      </button>
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold-700" />
        Pembayaran diproses di halaman aman Xendit. Metode yang tersedia ditampilkan di halaman pembayaran.
      </p>
    </div>
  );

  return (
    <div className="pb-28 lg:pb-12">
      <HomeLink className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-navy-900">
        <ArrowLeft className="size-4" /> Kembali ke halaman buku
      </HomeLink>
      <h1 className="mt-4 font-display text-3xl font-bold text-navy-900 sm:text-4xl">Checkout</h1>


      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <form id="checkout-form" noValidate onSubmit={pay} className="space-y-6">
          <Section n={1} title="Data Pemesan">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama lengkap" error={show("name")} className="sm:col-span-2">
                <input className={input} value={form.name} autoComplete="name" onChange={(e) => set("name", e.target.value)} onBlur={blur("name")} aria-invalid={!!show("name")} />
              </Field>
              <Field label="Email" hint="Untuk konfirmasi pembayaran" error={show("email")}>
                <input className={input} type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} onBlur={blur("email")} aria-invalid={!!show("email")} />
              </Field>
              <Field label="No. WhatsApp" hint="Contoh 0812xxxxxxx" error={show("phone")}>
                <input className={input} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} onBlur={blur("phone")} aria-invalid={!!show("phone")} />
              </Field>
            </div>
          </Section>

          <Section n={2} title="Alamat Pengiriman">
            <div className="grid gap-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-cream px-4 py-3 text-sm font-medium text-navy-900">
                <input type="checkbox" className="size-4 accent-navy-900" checked={form.sameRecipient} onChange={(e) => set("sameRecipient", e.target.checked)} />
                Penerima sama dengan pemesan
              </label>
              {!form.sameRecipient && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nama penerima" error={show("recipientName")}>
                    <input className={input} value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} onBlur={blur("recipientName")} aria-invalid={!!show("recipientName")} />
                  </Field>
                  <Field label="No. HP penerima" error={show("recipientPhone")}>
                    <input className={input} type="tel" inputMode="tel" value={form.recipientPhone} onChange={(e) => set("recipientPhone", e.target.value)} onBlur={blur("recipientPhone")} aria-invalid={!!show("recipientPhone")} />
                  </Field>
                </div>
              )}
              <Field label="Kecamatan / Kota" hint="Pilih dari daftar agar ongkir akurat" error={(submitted || touched.area) && errors.area}>
                <AreaCombobox
                  value={form.area}
                  onChange={(a) => {
                    set("area", a);
                    setTouched((t) => ({ ...t, area: true }));
                  }}
                  invalid={!!((submitted || touched.area) && errors.area)}
                  inputClassName={input}
                />
              </Field>
              <Field label="Alamat lengkap" hint="Nama jalan, nomor rumah, RT/RW, kelurahan, patokan" error={show("address")}>
                <textarea rows={3} className={input} value={form.address} autoComplete="street-address" onChange={(e) => set("address", e.target.value)} onBlur={blur("address")} aria-invalid={!!show("address")} />
              </Field>
              <Field label="Catatan untuk kurir (opsional)">
                <input className={input} value={form.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </div>
          </Section>

          <Section n={3} title="Pilih Pengiriman" id="pengiriman">
            {!form.area ? (
              <p className="flex items-center gap-2 rounded-xl bg-cream px-4 py-4 text-sm text-muted">
                <Truck className="size-4" /> Pilih kecamatan / kota tujuan untuk melihat ongkos kirim.
              </p>
            ) : ratesLoading ? (
              <div className="space-y-3" aria-busy="true">
                {[0, 1, 2].map((k) => (
                  <div key={k} className="h-[70px] animate-pulse rounded-2xl bg-navy-900/5" />
                ))}
              </div>
            ) : ratesError ? (
              <p role="alert" className="flex gap-2 rounded-xl bg-promo/[0.07] p-4 text-sm text-promo-dark">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {ratesError}
              </p>
            ) : rates && rates.length === 0 ? (
              <p className="rounded-xl bg-cream px-4 py-4 text-sm text-muted">Belum ada kurir yang tersedia untuk alamat ini.</p>
            ) : (
              <fieldset className="space-y-3">
                <legend className="sr-only">Kurir</legend>
                {rates?.map((r) => {
                  const key = `${r.courier_code}|${r.courier_service_code}`;
                  const checked = courier === key;
                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                        checked ? "border-gold-500 bg-gold-300/10 ring-4 ring-gold-400/15" : "border-navy-900/12 hover:border-navy-900/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="courier"
                        className="size-4 accent-navy-900"
                        checked={checked}
                        onChange={() => {
                          setCourier(key);
                          setPayError("");
                          gaEvent("add_shipping_info", { value: subtotal, shipping_tier: `${r.courier_name} ${r.courier_service_name}`, items: gaItems });
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-navy-900">
                          {r.courier_name} <span className="font-medium text-muted">· {r.courier_service_name}</span>
                        </span>
                        {r.etd && <span className="block text-sm text-muted">Estimasi {r.etd.replace(/days?/i, "hari").replace(/hours?/i, "jam")}</span>}
                      </span>
                      <span className="font-display text-lg font-bold text-navy-900 tabular-nums">{formatRupiah(r.price)}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}
          </Section>
        </form>

        <aside className="lg:sticky lg:top-24">{summary}</aside>
      </div>

      {/* Bilah bayar di mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-900/10 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="leading-tight">
            <p className="text-xs text-muted">Total</p>
            <p className="font-display text-xl font-bold text-navy-900 tabular-nums">{formatRupiah(total)}</p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={paying || !catalog.checkout.ready}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-gold-400 to-gold-500 px-5 py-3.5 font-display font-semibold text-navy-950 disabled:opacity-60"
          >
            {paying ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-4" />}
            {paying ? "Memproses…" : "Bayar Sekarang"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ n, title, id, children }: { n: number; title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-navy-900/10 bg-white p-6 sm:p-7">
      <h2 className="flex items-center gap-3 font-display text-xl font-bold text-navy-900">
        <span className="grid size-8 place-items-center rounded-full bg-navy-900 text-sm text-gold-400">{n}</span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, className = "", children }: { label: string; hint?: string; error?: string | false; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="block">
        <span className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-navy-900">{label}</span>
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </span>
        {children}
      </label>
      {error && <p className="mt-1.5 text-sm text-promo-dark">{error}</p>}
    </div>
  );
}
