"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Pencil, Plus, Shuffle, Trash2, X } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Badge, Button, Card, Empty, Field, inputCls, Loading, PageHeader } from "@/components/admin/ui";
import { formatDateTime, formatRupiah, fromWibInput, toWibInput } from "@/lib/format";

type State = "active" | "scheduled" | "ended" | "inactive" | "exhausted";
type DiscountRow = {
  id: number;
  name: string;
  product_id: number | null;
  product_name: string | null;
  type: "percent" | "fixed";
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  active: number;
  state: State;
};
type CouponRow = {
  id: number;
  code: string;
  description: string | null;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  max_discount: number | null;
  free_shipping: number;
  min_subtotal: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  active: number;
  used: number;
  paid_uses: number;
  total_discount: number;
  state: State;
};
type Resp = { discounts: DiscountRow[]; coupons: CouponRow[]; products: { id: number; name: string; price: number }[] };

const STATE: Record<State, { label: string; tone: "green" | "blue" | "slate" | "amber" }> = {
  active: { label: "Berlaku", tone: "green" },
  scheduled: { label: "Terjadwal", tone: "blue" },
  ended: { label: "Berakhir", tone: "slate" },
  inactive: { label: "Nonaktif", tone: "slate" },
  exhausted: { label: "Kuota habis", tone: "amber" },
};

const SHOP_URL = "https://bsm.humplus.com/checkout?add=buku-saku-manajer";

const period = (s: string | null, e: string | null) =>
  !s && !e ? "Tanpa batas waktu" : `${s ? formatDateTime(s) : "Sekarang"} – ${e ? formatDateTime(e) : "tanpa batas"}`;

const couponValue = (c: Pick<CouponRow, "type" | "value" | "max_discount" | "free_shipping">) =>
  c.type === "percent"
    ? `${c.value}%${c.max_discount ? ` (maks. ${formatRupiah(c.max_discount)})` : ""}${c.free_shipping ? " + gratis ongkir" : ""}`
    : c.type === "fixed"
      ? `${formatRupiah(c.value)}${c.free_shipping ? " + gratis ongkir" : ""}`
      : `Gratis ongkir${c.max_discount ? ` s.d. ${formatRupiah(c.max_discount)}` : ""}`;

export function PromosClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const tab = sp.get("tab") === "diskon" ? "diskon" : "kupon";
  const [d, setD] = useState<Resp | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [editCoupon, setEditCoupon] = useState<CouponRow | "new" | null>(null);
  const [editDiscount, setEditDiscount] = useState<DiscountRow | "new" | null>(null);

  useEffect(() => {
    adminFetch<Resp>("/api/admin/promos").then(setD).catch((e) => setErr((e as Error).message));
  }, []);

  // Respons tulis mengembalikan daftar promo (tanpa produk) — gabungkan dengan produk yang sudah ada.
  const refresh = (j: Omit<Resp, "products">) => setD((x) => (x ? { ...x, ...j } : x));

  async function remove(kind: "coupons" | "discounts", id: number, label: string) {
    if (!window.confirm(`Hapus ${label}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setMsg(null);
    try {
      refresh(await adminFetch(`/api/admin/${kind}/${id}`, { method: "DELETE" }));
      setMsg({ tone: "green", text: `${label} dihapus` });
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    }
  }

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(`${SHOP_URL}&kupon=${encodeURIComponent(code)}`);
      setMsg({ tone: "green", text: `Tautan kupon ${code} disalin — pembeli yang membukanya langsung mendapat kupon terpasang.` });
    } catch {
      setMsg({ tone: "red", text: "Gagal menyalin tautan" });
    }
  }

  if (err) return <Alert>{err}</Alert>;
  if (!d) return <Loading />;

  return (
    <>
      <PageHeader
        title="Diskon & Kupon"
        subtitle="Potongan harga otomatis dan kode kupon, lengkap dengan periode berlaku dan kuota"
        actions={
          tab === "kupon" ? (
            <Button onClick={() => setEditCoupon("new")}>
              <Plus className="size-4" /> Buat kupon
            </Button>
          ) : (
            <Button onClick={() => setEditDiscount("new")}>
              <Plus className="size-4" /> Buat diskon
            </Button>
          )
        }
      />

      <div role="tablist" className="mb-5 inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
        {(
          [
            ["kupon", `Kupon (${d.coupons.length})`],
            ["diskon", `Diskon produk (${d.discounts.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => router.replace(k === "kupon" ? "/admin/promos" : "/admin/promos?tab=diskon", { scroll: false })}
            className={`rounded-lg px-4 py-2 transition ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div className="mb-4">
          <Alert tone={msg.tone}>{msg.text}</Alert>
        </div>
      )}

      {tab === "kupon" ? (
        <Card>
          {d.coupons.length === 0 ? (
            <Empty title="Belum ada kupon" text="Buat kupon untuk promosi, misalnya potongan 10% atau gratis ongkir." />
          ) : (
            <div className="-m-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Kode</th>
                    <th className="px-5 py-3">Potongan</th>
                    <th className="hidden px-5 py-3 lg:table-cell">Periode (WIB)</th>
                    <th className="px-5 py-3 text-right">Dipakai</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.coupons.map((c) => (
                    <tr key={c.id} className="align-top hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-semibold text-slate-900">{c.code}</span>
                        {c.description && <p className="max-w-56 text-xs text-slate-500">{c.description}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{couponValue(c)}</p>
                        <p className="text-xs text-slate-500">
                          {[
                            c.min_subtotal ? `min. belanja ${formatRupiah(c.min_subtotal)}` : "",
                            c.per_customer_limit ? `${c.per_customer_limit}× per pelanggan` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Tanpa syarat"}
                        </p>
                      </td>
                      <td className="hidden px-5 py-3.5 text-slate-600 lg:table-cell">{period(c.starts_at, c.ends_at)}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        <p className="font-semibold text-slate-900">
                          {c.used}
                          {c.usage_limit != null && <span className="text-slate-400"> / {c.usage_limit}</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {c.paid_uses} dibayar · {formatRupiah(c.total_discount)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={STATE[c.state].tone}>{STATE[c.state].label}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <IconBtn label={`Salin tautan kupon ${c.code}`} onClick={() => copyLink(c.code)}>
                            <Copy className="size-4" />
                          </IconBtn>
                          <IconBtn label={`Ubah kupon ${c.code}`} onClick={() => setEditCoupon(c)}>
                            <Pencil className="size-4" />
                          </IconBtn>
                          <IconBtn label={`Hapus kupon ${c.code}`} onClick={() => remove("coupons", c.id, `Kupon ${c.code}`)}>
                            <Trash2 className="size-4" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          {d.discounts.length === 0 ? (
            <Empty title="Belum ada diskon" text="Diskon langsung memotong harga produk di checkout selama periodenya berlaku." />
          ) : (
            <div className="-m-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Diskon</th>
                    <th className="px-5 py-3">Potongan</th>
                    <th className="hidden px-5 py-3 lg:table-cell">Periode (WIB)</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.discounts.map((x) => (
                    <tr key={x.id} className="align-top hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{x.name}</p>
                        <p className="text-xs text-slate-500">{x.product_id ? x.product_name || `Produk #${x.product_id}` : "Semua produk"}</p>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{x.type === "percent" ? `${x.value}%` : formatRupiah(x.value)}</td>
                      <td className="hidden px-5 py-3.5 text-slate-600 lg:table-cell">{period(x.starts_at, x.ends_at)}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={STATE[x.state].tone}>{STATE[x.state].label}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <IconBtn label={`Ubah diskon ${x.name}`} onClick={() => setEditDiscount(x)}>
                            <Pencil className="size-4" />
                          </IconBtn>
                          <IconBtn label={`Hapus diskon ${x.name}`} onClick={() => remove("discounts", x.id, `Diskon ${x.name}`)}>
                            <Trash2 className="size-4" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <ul className="mt-4 space-y-1 text-xs text-slate-500">
        <li>• Diskon produk berlaku otomatis; bila beberapa diskon cocok untuk satu produk, dipakai potongan terbesar (tidak ditumpuk).</li>
        <li>• Satu pesanan hanya bisa memakai satu kupon. Kupon bisa digabung dengan diskon produk (dihitung dari harga setelah diskon).</li>
        <li>
          • “Dipakai” menghitung pesanan yang belum kedaluwarsa/dibatalkan — pesanan menunggu bayar ikut memakai kuota sampai kedaluwarsa (24 jam).
          Batas per pelanggan (per email) hanya menghitung pesanan yang sudah dibayar.
        </li>
        <li>• Gratis ongkir ditanggung toko: ongkir ke kurir tetap dibayar sesuai tarif.</li>
        <li>• Total pembayaran tidak akan turun di bawah “Minimal total pembayaran” (Pengaturan).</li>
      </ul>

      {editCoupon && (
        <CouponEditor
          coupon={editCoupon === "new" ? null : editCoupon}
          onClose={() => setEditCoupon(null)}
          onSaved={(j, text) => {
            refresh(j);
            setEditCoupon(null);
            setMsg({ tone: "green", text });
          }}
        />
      )}
      {editDiscount && (
        <DiscountEditor
          discount={editDiscount === "new" ? null : editDiscount}
          products={d.products}
          onClose={() => setEditDiscount(null)}
          onSaved={(j, text) => {
            refresh(j);
            setEditDiscount(null);
            setMsg({ tone: "green", text });
          }}
        />
      )}
    </>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
      {children}
    </button>
  );
}

/* ───────────── Panel samping ───────────── */

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/** Periode berlaku: input WIB + pintasan durasi. */
function PeriodFields({ start, end, setStart, setEnd }: { start: string; end: string; setStart: (v: string) => void; setEnd: (v: string) => void }) {
  const addDays = (days: number) => {
    const base = start ? new Date(`${start}:00+07:00`) : new Date();
    setEnd(toWibInput(new Date(base.getTime() + days * 86_400_000)));
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mulai (WIB)" hint="Kosong = langsung berlaku">
          <input type="datetime-local" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Berakhir (WIB)" hint="Kosong = tanpa batas">
          <input type="datetime-local" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-500">Durasi cepat:</span>
        {[
          [1, "1 hari"],
          [3, "3 hari"],
          [7, "7 hari"],
          [14, "14 hari"],
          [30, "30 hari"],
        ].map(([n, l]) => (
          <button key={n} type="button" onClick={() => addDays(n as number)} className="rounded-full border border-slate-200 px-2.5 py-1 font-medium text-slate-700 hover:border-slate-400">
            {l}
          </button>
        ))}
        {(start || end) && (
          <button
            type="button"
            onClick={() => {
              setStart("");
              setEnd("");
            }}
            className="rounded-full px-2.5 py-1 font-medium text-slate-500 hover:text-slate-900"
          >
            Kosongkan
          </button>
        )}
      </div>
    </div>
  );
}

const num = (s: string) => (s.trim() === "" ? null : Number(s));
const digits = (s: string) => s.replace(/\D/g, "");

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`rounded-lg px-3 py-2 ${value === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function CouponEditor({
  coupon,
  onClose,
  onSaved,
}: {
  coupon: CouponRow | null;
  onClose: () => void;
  onSaved: (j: Omit<Resp, "products">, text: string) => void;
}) {
  const [f, setF] = useState({
    code: coupon?.code || "",
    description: coupon?.description || "",
    type: coupon?.type || ("percent" as CouponRow["type"]),
    value: coupon ? String(coupon.value) : "",
    max_discount: coupon?.max_discount != null ? String(coupon.max_discount) : "",
    free_shipping: coupon ? !!coupon.free_shipping : false,
    min_subtotal: coupon?.min_subtotal != null ? String(coupon.min_subtotal) : "",
    start: toWibInput(coupon?.starts_at),
    end: toWibInput(coupon?.ends_at),
    usage_limit: coupon?.usage_limit != null ? String(coupon.usage_limit) : "",
    per_customer_limit: coupon?.per_customer_limit != null ? String(coupon.per_customer_limit) : "",
    active: coupon ? !!coupon.active : true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  function randomCode() {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    set("code", "BSM" + Array.from(bytes, (b) => abc[b % abc.length]).join(""));
  }

  // Contoh perhitungan untuk 1 buku Rp120.000 dan ongkir Rp15.000 (ilustrasi).
  const ex = (() => {
    const sub = 120000;
    const ship = 15000;
    const v = Number(f.value) || 0;
    const max = Number(f.max_discount) || 0;
    const extra = f.free_shipping ? ship : 0;
    if (f.type === "percent") return Math.min(Math.floor((sub * Math.min(v, 100)) / 100), max || Infinity) + extra;
    if (f.type === "fixed") return Math.min(v, sub) + extra;
    return Math.min(ship, max || ship);
  })();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        code: f.code,
        description: f.description.trim() || null,
        type: f.type,
        value: f.type === "free_shipping" ? 0 : Number(f.value || 0),
        max_discount: f.type === "fixed" ? null : num(f.max_discount),
        free_shipping: f.type !== "free_shipping" && f.free_shipping,
        min_subtotal: num(f.min_subtotal),
        starts_at: f.start ? fromWibInput(f.start) : null,
        ends_at: f.end ? fromWibInput(f.end) : null,
        usage_limit: num(f.usage_limit),
        per_customer_limit: num(f.per_customer_limit),
        active: f.active,
      };
      const j = await adminFetch<Omit<Resp, "products">>(coupon ? `/api/admin/coupons/${coupon.id}` : "/api/admin/coupons", {
        method: coupon ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      onSaved(j, coupon ? `Kupon ${f.code.toUpperCase()} diperbarui` : `Kupon ${f.code.toUpperCase()} dibuat`);
    } catch (e2) {
      setError((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <Panel title={coupon ? `Ubah kupon ${coupon.code}` : "Buat kupon"} onClose={onClose}>
      <form onSubmit={save} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="Kode kupon" hint="Huruf/angka, 3–32 karakter. Pembeli mengetik kode ini di checkout.">
          <div className="flex gap-2">
            <input className={`${inputCls} font-mono uppercase`} value={f.code} maxLength={32} onChange={(e) => set("code", e.target.value.toUpperCase())} required />
            <Button type="button" variant="secondary" onClick={randomCode} title="Buat kode acak">
              <Shuffle className="size-4" />
            </Button>
          </div>
        </Field>
        <Field label="Catatan internal (opsional)" hint="Hanya terlihat di dashboard">
          <input className={inputCls} value={f.description} maxLength={255} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Jenis potongan</p>
          <Segmented
            value={f.type}
            onChange={(v) => set("type", v)}
            options={[
              ["percent", "Persen"],
              ["fixed", "Nominal"],
              ["free_shipping", "Gratis ongkir"],
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {f.type !== "free_shipping" && (
            <Field label={f.type === "percent" ? "Potongan (%)" : "Potongan (Rp)"}>
              <input className={inputCls} inputMode="numeric" value={f.value} onChange={(e) => set("value", digits(e.target.value))} required />
            </Field>
          )}
          {f.type !== "fixed" && (
            <Field label={f.type === "percent" ? "Maks. potongan (Rp, opsional)" : "Maks. potongan ongkir (Rp, opsional)"} hint="Kosong = tanpa batas">
              <input className={inputCls} inputMode="numeric" value={f.max_discount} onChange={(e) => set("max_discount", digits(e.target.value))} />
            </Field>
          )}
          <Field label="Min. belanja (Rp, opsional)" hint="Dari subtotal produk">
            <input className={inputCls} inputMode="numeric" value={f.min_subtotal} onChange={(e) => set("min_subtotal", digits(e.target.value))} />
          </Field>
        </div>
        {f.type !== "free_shipping" && (
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-800">
            <input type="checkbox" className="mt-0.5 size-4 accent-slate-900" checked={f.free_shipping} onChange={(e) => set("free_shipping", e.target.checked)} />
            <span>
              <span className="font-medium">+ Gratis ongkir</span>
              <span className="block text-xs text-slate-500">Selain potongan di atas, ongkos kirim juga digratiskan penuh (ditanggung toko).</span>
            </span>
          </label>
        )}
        <PeriodFields start={f.start} end={f.end} setStart={(v) => set("start", v)} setEnd={(v) => set("end", v)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kuota total (opsional)" hint="Kosong = tanpa batas">
            <input className={inputCls} inputMode="numeric" value={f.usage_limit} onChange={(e) => set("usage_limit", digits(e.target.value))} />
          </Field>
          <Field label="Maks. per pelanggan (opsional)" hint="Per email; kosong = tanpa batas">
            <input className={inputCls} inputMode="numeric" value={f.per_customer_limit} onChange={(e) => set("per_customer_limit", digits(e.target.value))} />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
          <input type="checkbox" className="size-4 accent-slate-900" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
          Kupon aktif
        </label>
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          Ilustrasi: 1 buku {formatRupiah(120000)} + ongkir {formatRupiah(15000)} → potongan <b>{formatRupiah(ex)}</b>
          {f.min_subtotal && Number(f.min_subtotal) > 120000 ? " (tidak memenuhi min. belanja)" : ""}. Total tidak akan di bawah minimal total pembayaran.
        </p>
        <div className="flex gap-2 pt-1">
          <Button type="submit" loading={busy}>
            {coupon ? "Simpan perubahan" : "Buat kupon"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function DiscountEditor({
  discount,
  products,
  onClose,
  onSaved,
}: {
  discount: DiscountRow | null;
  products: Resp["products"];
  onClose: () => void;
  onSaved: (j: Omit<Resp, "products">, text: string) => void;
}) {
  const [f, setF] = useState({
    name: discount?.name || "",
    product_id: discount?.product_id != null ? String(discount.product_id) : "",
    type: discount?.type || ("percent" as DiscountRow["type"]),
    value: discount ? String(discount.value) : "",
    start: toWibInput(discount?.starts_at),
    end: toWibInput(discount?.ends_at),
    active: discount ? !!discount.active : true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const target = products.find((p) => String(p.id) === f.product_id) || products[0];
  const v = Number(f.value) || 0;
  const cut = target ? (f.type === "percent" ? Math.floor((target.price * Math.min(v, 100)) / 100) : Math.min(v, target.price)) : 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const j = await adminFetch<Omit<Resp, "products">>(discount ? `/api/admin/discounts/${discount.id}` : "/api/admin/discounts", {
        method: discount ? "PATCH" : "POST",
        body: JSON.stringify({
          name: f.name,
          product_id: f.product_id ? Number(f.product_id) : null,
          type: f.type,
          value: Number(f.value || 0),
          starts_at: f.start ? fromWibInput(f.start) : null,
          ends_at: f.end ? fromWibInput(f.end) : null,
          active: f.active,
        }),
      });
      onSaved(j, discount ? `Diskon “${f.name}” diperbarui` : `Diskon “${f.name}” dibuat`);
    } catch (e2) {
      setError((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <Panel title={discount ? "Ubah diskon" : "Buat diskon"} onClose={onClose}>
      <form onSubmit={save} className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <Field label="Nama diskon" hint="Tampil ke pembeli sebagai label, mis. “Promo Akhir Tahun”">
          <input className={inputCls} value={f.name} maxLength={120} onChange={(e) => set("name", e.target.value)} required />
        </Field>
        <Field label="Berlaku untuk">
          <select className={inputCls} value={f.product_id} onChange={(e) => set("product_id", e.target.value)}>
            <option value="">Semua produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({formatRupiah(p.price)})
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Jenis potongan</p>
          <Segmented
            value={f.type}
            onChange={(t) => set("type", t)}
            options={[
              ["percent", "Persen"],
              ["fixed", "Nominal"],
            ]}
          />
        </div>
        <Field label={f.type === "percent" ? "Potongan (%)" : "Potongan per item (Rp)"}>
          <input className={inputCls} inputMode="numeric" value={f.value} onChange={(e) => set("value", digits(e.target.value))} required />
        </Field>
        <PeriodFields start={f.start} end={f.end} setStart={(x) => set("start", x)} setEnd={(x) => set("end", x)} />
        <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
          <input type="checkbox" className="size-4 accent-slate-900" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
          Diskon aktif
        </label>
        {target && (
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            {target.name}: <s>{formatRupiah(target.price)}</s> → <b>{formatRupiah(target.price - cut)}</b> di checkout. Teks harga di landing page tidak berubah
            otomatis.
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button type="submit" loading={busy}>
            {discount ? "Simpan perubahan" : "Buat diskon"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
        </div>
      </form>
    </Panel>
  );
}
