"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { AreaCombobox, type AreaValue } from "@/components/shop/area-combobox";
import { Alert, Badge, Button, Card, Field, inputCls, Loading, PageHeader } from "@/components/admin/ui";

type Settings = { origin_area_id: string; origin_area_name: string; origin_postal_code: string; couriers: string; max_qty_per_item: number };
type Resp = { settings: Settings; defaultCouriers: string; integrations: { biteship: string; xendit: string; xenditWebhook: string } };

/** Kode kurir dari dokumentasi Biteship (couriers overview). */
const COURIERS = [
  ["jne", "JNE"], ["jnt", "J&T Express"], ["sicepat", "SiCepat"], ["anteraja", "AnterAja"], ["pos", "POS Indonesia"],
  ["idexpress", "ID Express"], ["sap", "SAP Express"], ["tiki", "TIKI"], ["ninja", "Ninja Xpress"], ["lion", "Lion Parcel"],
  ["wahana", "Wahana"], ["rpx", "RPX"], ["jdl", "JDL"], ["paxel", "Paxel"],
] as const;

export function SettingsClient() {
  const [d, setD] = useState<Resp | null>(null);
  const [area, setArea] = useState<AreaValue | null>(null);
  const [couriers, setCouriers] = useState<string[]>([]);
  const [maxQty, setMaxQty] = useState("20");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);

  useEffect(() => {
    adminFetch<Resp>("/api/admin/settings")
      .then((j) => {
        setD(j);
        if (j.settings.origin_area_id) setArea({ id: j.settings.origin_area_id, name: j.settings.origin_area_name, postal_code: j.settings.origin_postal_code || null });
        setCouriers(j.settings.couriers.split(",").filter(Boolean));
        setMaxQty(String(j.settings.max_qty_per_item));
      })
      .catch((e) => setMsg({ tone: "red", text: (e as Error).message }));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!area) return setMsg({ tone: "red", text: "Pilih lokasi asal pengiriman dari daftar" });
    if (couriers.length === 0) return setMsg({ tone: "red", text: "Pilih minimal satu kurir" });
    setBusy(true);
    setMsg(null);
    try {
      await adminFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          origin_area_id: area.id,
          origin_area_name: area.name,
          origin_postal_code: area.postal_code || "",
          couriers: couriers.join(","),
          max_qty_per_item: Number(maxQty) || 20,
        }),
      });
      setMsg({ tone: "green", text: "Pengaturan tersimpan" });
    } catch (e2) {
      setMsg({ tone: "red", text: (e2 as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!d) return msg ? <Alert>{msg.text}</Alert> : <Loading />;
  const integ = d.integrations;
  const row = (label: string, state: string, envName: string) => (
    <li className="flex items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-2.5 text-sm">
        {state === "missing" ? <CircleAlert className="size-5 text-amber-600" /> : <CheckCircle2 className="size-5 text-emerald-600" />}
        <span>
          <span className="font-medium text-slate-900">{label}</span>
          <span className="block font-mono text-xs text-slate-500">{envName}</span>
        </span>
      </span>
      {state === "missing" ? <Badge tone="amber">Belum diisi</Badge> : state === "test" ? <Badge tone="blue">Mode test</Badge> : state === "live" ? <Badge tone="green">Live</Badge> : <Badge tone="green">Terisi</Badge>}
    </li>
  );

  return (
    <>
      <PageHeader title="Pengaturan" subtitle="Pengiriman & integrasi pembayaran" />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Pengiriman (Biteship)">
          <form onSubmit={save} className="space-y-5">
            {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
            <Field label="Lokasi asal pengiriman" hint="Kecamatan tempat buku dikirim (gudang/kantor). Wajib diisi agar ongkir bisa dihitung.">
              <AreaCombobox value={area} onChange={setArea} inputClassName={inputCls} placeholder="Ketik kecamatan / kota / kode pos asal…" />
            </Field>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Kurir yang ditawarkan</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {COURIERS.map(([code, name]) => (
                  <label key={code} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${couriers.includes(code) ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                    <input
                      type="checkbox"
                      className="size-4 accent-slate-900"
                      checked={couriers.includes(code)}
                      onChange={(e) => setCouriers((c) => (e.target.checked ? [...c, code] : c.filter((x) => x !== code)))}
                    />
                    {name}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Hanya layanan yang tersedia untuk rute & akun Biteship Anda yang akan muncul di checkout.</p>
            </fieldset>
            <Field label="Maksimal jumlah per produk dalam satu pesanan">
              <input className={`${inputCls} max-w-32`} inputMode="numeric" value={maxQty} onChange={(e) => setMaxQty(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Button type="submit" loading={busy}>Simpan pengaturan</Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card title="Integrasi">
            <ul className="-my-3 divide-y divide-slate-100">
              {row("Xendit secret key", integ.xendit, "XENDIT_SECRET_KEY")}
              {row("Xendit webhook token", integ.xenditWebhook, "XENDIT_WEBHOOK_TOKEN")}
              {row("Biteship API key", integ.biteship, "BITESHIP_API_KEY")}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Nilai kunci tidak pernah ditampilkan. Isi/ubah di hPanel → Websites → bsm.humplus.com → Node.js → Environment variables.
            </p>
          </Card>
          <Card title="Webhook Xendit">
            <p className="text-sm text-slate-700">Daftarkan URL ini di dashboard Xendit (Settings → Webhooks) untuk event Payment Session:</p>
            <code className="mt-2 block rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs break-all text-slate-900">https://bsm.humplus.com/api/webhooks/xendit</code>
            <p className="mt-2 text-xs text-slate-500">Salin “Webhook verification token” dari halaman yang sama ke XENDIT_WEBHOOK_TOKEN.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
