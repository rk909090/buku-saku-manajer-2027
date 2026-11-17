"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/api";
import { Alert, Button, Card, Field, inputCls, Loading, PageHeader } from "@/components/admin/ui";

type Product = {
  id: number;
  slug: string;
  name: string;
  price: number;
  weight_g: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  stock: number | null;
  image_url: string | null;
  active: number;
};

type Draft = Record<"name" | "price" | "weight_g" | "length_cm" | "width_cm" | "height_cm" | "stock", string> & { active: boolean };

const toDraft = (p: Product): Draft => ({
  name: p.name,
  price: String(p.price),
  weight_g: p.weight_g == null ? "" : String(p.weight_g),
  length_cm: p.length_cm == null ? "" : String(p.length_cm),
  width_cm: p.width_cm == null ? "" : String(p.width_cm),
  height_cm: p.height_cm == null ? "" : String(p.height_cm),
  stock: p.stock == null ? "" : String(p.stock),
  active: !!p.active,
});

export function ProductsClient() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    adminFetch<{ products: Product[] }>("/api/admin/products").then((j) => setProducts(j.products)).catch((e) => setErr((e as Error).message));
  }, []);
  return (
    <>
      <PageHeader title="Produk" subtitle="Harga, berat & dimensi untuk ongkir, serta stok" />
      {err && <Alert>{err}</Alert>}
      {!products ? <Loading /> : products.map((p) => <ProductForm key={p.id} product={p} onSaved={setProducts} />)}
    </>
  );
}

function ProductForm({ product, onSaved }: { product: Product; onSaved: (p: Product[]) => void }) {
  const [d, setD] = useState<Draft>(toDraft(product));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const set = (k: keyof Draft, v: string | boolean) => setD((x) => ({ ...x, [k]: v }));
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const j = await adminFetch<{ products: Product[] }>(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: d.name,
          price: Number(d.price),
          weight_g: num(d.weight_g),
          length_cm: num(d.length_cm),
          width_cm: num(d.width_cm),
          height_cm: num(d.height_cm),
          stock: num(d.stock),
          active: d.active,
        }),
      });
      onSaved(j.products);
      setMsg({ tone: "green", text: "Produk tersimpan" });
    } catch (e2) {
      setMsg({ tone: "red", text: (e2 as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={product.name} className="mb-6">
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[160px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element -- gambar statis kecil dari /public */}
        <img src={product.image_url || "/images/bsm-cover.png"} alt="" className="mx-auto w-32 lg:w-full" />
        <div className="space-y-5">
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          {!product.weight_g && (
            <Alert tone="amber">
              <b>Berat belum diisi.</b> Ongkir tidak bisa dihitung sampai berat produk (dalam gram, sudah termasuk kemasan) diisi.
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama produk">
              <input className={inputCls} value={d.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Harga (Rp)" hint="Harga di checkout. Teks harga di landing page ada di kode (content.ts) — samakan bila diubah.">
              <input className={inputCls} inputMode="numeric" value={d.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} required />
            </Field>
            <Field label="Berat per buku (gram)" hint="Termasuk kemasan. Dipakai Biteship untuk ongkir.">
              <input className={inputCls} inputMode="numeric" value={d.weight_g} onChange={(e) => set("weight_g", e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Stok" hint="Kosongkan = tidak dibatasi. Berkurang otomatis saat pesanan dibayar.">
              <input className={inputCls} inputMode="numeric" value={d.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Dimensi paket (cm, opsional)</p>
            <div className="grid grid-cols-3 gap-3">
              <input aria-label="Panjang (cm)" placeholder="Panjang" className={inputCls} inputMode="decimal" value={d.length_cm} onChange={(e) => set("length_cm", e.target.value)} />
              <input aria-label="Lebar (cm)" placeholder="Lebar" className={inputCls} inputMode="decimal" value={d.width_cm} onChange={(e) => set("width_cm", e.target.value)} />
              <input aria-label="Tinggi (cm)" placeholder="Tinggi" className={inputCls} inputMode="decimal" value={d.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Menurut dokumentasi Biteship, dimensi dapat memengaruhi berat yang ditagih kurir.</p>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
            <input type="checkbox" className="size-4 accent-slate-900" checked={d.active} onChange={(e) => set("active", e.target.checked)} />
            Produk aktif (bisa dibeli)
          </label>
          <Button type="submit" loading={busy}>Simpan produk</Button>
        </div>
      </form>
    </Card>
  );
}
