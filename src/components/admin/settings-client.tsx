"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { formatWhatsapp, normalizeWhatsapp, waLink } from "@/lib/whatsapp";
import { parseChannels, VA_CHANNELS } from "@/lib/shop/payment-channels";
import { AreaCombobox, type AreaValue } from "@/components/shop/area-combobox";
import { Alert, Badge, Button, Card, Field, inputCls, Loading, PageHeader } from "@/components/admin/ui";

type Settings = { origin_area_id: string; origin_area_name: string; origin_postal_code: string; couriers: string; max_qty_per_item: number; min_order_total: number; notify_emails: string; notify_on_pending: number; whatsapp_number: string; payment_channels: string };
type Resp = { settings: Settings; defaultCouriers: string; integrations: { biteship: string; xendit: string; xenditWebhook: string; resend: string } };

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
  const [minTotal, setMinTotal] = useState("10000");
  const [busy, setBusy] = useState(false);
  const [notifyEmails, setNotifyEmails] = useState("");
  const [notifyPending, setNotifyPending] = useState(false);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);

  useEffect(() => {
    adminFetch<Resp>("/api/admin/settings")
      .then((j) => {
        setD(j);
        setNotifyEmails(j.settings.notify_emails.split(",").filter(Boolean).join("\n"));
        setNotifyPending(!!j.settings.notify_on_pending);
        if (j.settings.origin_area_id) setArea({ id: j.settings.origin_area_id, name: j.settings.origin_area_name, postal_code: j.settings.origin_postal_code || null });
        setCouriers(j.settings.couriers.split(",").filter(Boolean));
        setMaxQty(String(j.settings.max_qty_per_item));
        setMinTotal(String(j.settings.min_order_total));
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
          min_order_total: Number(minTotal) || 0,
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
            <Field
              label="Minimal total pembayaran (Rp)"
              hint="Diskon/kupon tidak akan menurunkan total di bawah angka ini. Menurut tabel metode pembayaran Xendit: BCA VA & Alfamart/Indomaret min. Rp10.000, kartu Rp5.000, DANA/OVO Rp100, QRIS/ShopeePay/GoPay Rp1. Bila diturunkan di bawah Rp10.000, sebagian metode mungkin tidak bisa dipakai."
            >
              <input className={`${inputCls} max-w-40`} inputMode="numeric" value={minTotal} onChange={(e) => setMinTotal(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Button type="submit" loading={busy}>Simpan pengaturan</Button>
          </form>
        </Card>

        <div className="space-y-6">
          <PaymentChannelsCard initial={d.settings.payment_channels} minTotal={d.settings.min_order_total} />
          <WhatsappCard initial={d.settings.whatsapp_number} />
          <NotificationCard
            emails={notifyEmails}
            setEmails={setNotifyEmails}
            pending={notifyPending}
            setPending={setNotifyPending}
            resendReady={integ.resend !== "missing"}
          />
          <Card title="Integrasi">
            <ul className="-my-3 divide-y divide-slate-100">
              {row("Xendit secret key", integ.xendit, "XENDIT_SECRET_KEY")}
              {row("Xendit webhook token", integ.xenditWebhook, "XENDIT_WEBHOOK_TOKEN")}
              {row("Biteship API key", integ.biteship, "BITESHIP_API_KEY")}
              {row("Resend API key (email)", integ.resend, "RESEND_API_KEY")}
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

const PREVIEWS: [string, string][] = [
  ["created", "Pesanan diterima"],
  ["paid", "Pembayaran diterima"],
  ["processing", "Diproses"],
  ["shipped", "Dikirim + resi"],
  ["tracking", "Resi diperbarui"],
  ["completed", "Selesai"],
  ["cancelled", "Dibatalkan"],
  ["expired", "Kedaluwarsa"],
  ["admin", "Notifikasi admin"],
];

function NotificationCard({
  emails,
  setEmails,
  pending,
  setPending,
  resendReady,
}: {
  emails: string;
  setEmails: (v: string) => void;
  pending: boolean;
  setPending: (v: boolean) => void;
  resendReady: boolean;
}) {
  const [busy, setBusy] = useState<"" | "save" | "test">("");
  const [msg, setMsg] = useState<{ tone: "green" | "red" | "amber"; text: string } | null>(null);

  async function save() {
    setBusy("save");
    setMsg(null);
    try {
      const j = await adminFetch<{ settings: Settings }>("/api/admin/settings/notifications", {
        method: "PUT",
        body: JSON.stringify({ notify_emails: emails, notify_on_pending: pending }),
      });
      setEmails(j.settings.notify_emails.split(",").filter(Boolean).join("\n"));
      setMsg({ tone: "green", text: "Penerima notifikasi tersimpan" });
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    } finally {
      setBusy("");
    }
  }

  async function test() {
    setBusy("test");
    setMsg(null);
    try {
      const j = await adminFetch<{ to: string[] }>("/api/admin/email/test", { method: "POST", body: "{}" });
      setMsg({ tone: "green", text: `Email uji dikirim ke ${j.to.join(", ")}. Cek kotak masuk (dan folder spam).` });
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    } finally {
      setBusy("");
    }
  }

  return (
    <Card title="Notifikasi email">
      <div className="space-y-4">
        {!resendReady && (
          <Alert tone="amber">
            <b>RESEND_API_KEY belum diisi.</b> Email (ke pelanggan maupun admin) belum dikirim sampai kunci Resend diisi di hPanel dan domain
            humplus.com terverifikasi di Resend.
          </Alert>
        )}
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Field label="Email penerima notifikasi pesanan" hint="Satu email per baris (boleh lebih dari satu, maks. 20). Kosongkan untuk mematikan notifikasi admin.">
          <textarea rows={4} className={`${inputCls} font-mono text-sm`} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder={"owner@humplus.com\ngudang@humplus.com"} />
        </Field>
        <label className="flex items-start gap-3 text-sm text-slate-800">
          <input type="checkbox" className="mt-0.5 size-4 accent-slate-900" checked={pending} onChange={(e) => setPending(e.target.checked)} />
          <span>
            Juga kirim saat pesanan dibuat (belum dibayar)
            <span className="block text-xs text-slate-500">Default: hanya saat pembayaran diterima, agar tidak ramai oleh pesanan yang tidak jadi dibayar.</span>
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={save} loading={busy === "save"}>
            Simpan penerima
          </Button>
          <Button type="button" variant="secondary" onClick={test} loading={busy === "test"} disabled={!resendReady}>
            Kirim email uji
          </Button>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700">Pratinjau desain email (data contoh)</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PREVIEWS.map(([k, l]) => (
              <a
                key={k}
                href={`/api/admin/email/preview?kind=${k}`}
                target="_blank"
                rel="noopener"
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
              >
                {l}
              </a>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Pelanggan otomatis menerima email saat pesanan dibuat, dibayar, diproses, dikirim (dengan nomor resi), resi diubah, selesai,
            dibatalkan, atau kedaluwarsa. Pengirim: noreply@humplus.com. Hasil pengiriman tercatat di riwayat tiap pesanan.
          </p>
        </div>
      </div>
    </Card>
  );
}

function WhatsappCard({ initial }: { initial: string }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const preview = normalizeWhatsapp(value);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const j = await adminFetch<{ settings: Settings }>("/api/admin/settings/contact", {
        method: "PUT",
        body: JSON.stringify({ whatsapp_number: value }),
      });
      setSaved(j.settings.whatsapp_number);
      setValue(j.settings.whatsapp_number);
      setMsg({ tone: "green", text: "Nomor WhatsApp tersimpan dan langsung dipakai di website & email" });
    } catch (e2) {
      setMsg({ tone: "red", text: (e2 as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Kontak WhatsApp">
      <form onSubmit={save} className="space-y-4">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Field
          label="Nomor WhatsApp toko"
          hint="Dipakai di tombol chat landing page, halaman checkout, dan email pelanggan. Boleh ditulis 08… atau 62…"
        >
          <input
            className={inputCls}
            type="tel"
            inputMode="numeric"
            maxLength={20}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d+\s-]/g, ""))}
            placeholder="087840848566"
            required
          />
        </Field>
        <p className="text-xs text-slate-500">
          {preview ? (
            <>
              Akan disimpan sebagai <b className="text-slate-800">{formatWhatsapp(preview)}</b>
            </>
          ) : (
            <span className="text-rose-700">Nomor belum valid (10–15 digit)</span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={busy} disabled={!preview || preview === saved}>
            Simpan nomor
          </Button>
          <a href={waLink(saved)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-700 hover:underline">
            Coba buka WhatsApp ({formatWhatsapp(saved)}) ↗
          </a>
        </div>
      </form>
    </Card>
  );
}

function PaymentChannelsCard({ initial, minTotal }: { initial: string; minTotal: number }) {
  const [saved, setSaved] = useState(parseChannels(initial));
  const [mode, setMode] = useState<"all" | "va">(saved.length ? "va" : "all");
  const [picked, setPicked] = useState<string[]>(saved);
  const [busy, setBusy] = useState<"" | "save" | "test">("");
  const [msg, setMsg] = useState<{ tone: "green" | "red" | "amber"; text: string } | null>(null);
  const [testUrl, setTestUrl] = useState("");
  const chosen = mode === "all" ? [] : picked;
  const dirty = chosen.join(",") !== saved.join(",");
  const toggle = (code: string, on: boolean) => {
    setPicked((p) => (on ? [...p, code] : p.filter((c) => c !== code)));
    setTestUrl("");
  };

  async function test() {
    if (mode === "va" && chosen.length === 0) return setMsg({ tone: "red", text: "Pilih minimal satu bank" });
    setBusy("test");
    setMsg(null);
    setTestUrl("");
    try {
      const j = await adminFetch<{ url: string }>("/api/admin/settings/payments/test", { method: "POST", body: JSON.stringify({ payment_channels: chosen }) });
      setTestUrl(j.url);
      setMsg({ tone: "green", text: "Xendit menerima pilihan ini. Buka halaman uji untuk melihat metode yang tampil (jangan dibayar; kedaluwarsa 30 menit)." });
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    } finally {
      setBusy("");
    }
  }

  async function save() {
    if (mode === "va" && chosen.length === 0) return setMsg({ tone: "red", text: "Pilih minimal satu bank" });
    setBusy("save");
    setMsg(null);
    try {
      const j = await adminFetch<{ settings: Settings }>("/api/admin/settings/payments", { method: "PUT", body: JSON.stringify({ payment_channels: chosen }) });
      const next = parseChannels(j.settings.payment_channels);
      setSaved(next);
      setMsg({ tone: "green", text: next.length ? `Tersimpan: pembeli hanya melihat Virtual Account (${next.length} bank).` : "Tersimpan: semua metode yang aktif di Xendit ditampilkan." });
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    } finally {
      setBusy("");
    }
  }

  return (
    <Card title="Metode pembayaran (Xendit)">
      <div className="space-y-4">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <div className="grid gap-2">
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${mode === "all" ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
            <input type="radio" name="paymode" className="mt-0.5 size-4 accent-slate-900" checked={mode === "all"} onChange={() => { setMode("all"); setTestUrl(""); }} />
            <span>
              <span className="font-medium text-slate-900">Semua metode yang aktif di akun Xendit</span>
              <span className="block text-xs text-slate-500">QRIS, e-wallet, VA, gerai, kartu — sesuai aktivasi di dashboard Xendit.</span>
            </span>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${mode === "va" ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
            <input type="radio" name="paymode" className="mt-0.5 size-4 accent-slate-900" checked={mode === "va"} onChange={() => { setMode("va"); setTestUrl(""); }} />
            <span>
              <span className="font-medium text-slate-900">Hanya Virtual Account (transfer bank)</span>
              <span className="block text-xs text-slate-500">Centang HANYA bank yang sudah aktif di Xendit (Dashboard Xendit → Payment Channels).</span>
            </span>
          </label>
        </div>
        {mode === "va" && (
          <div className="grid grid-cols-2 gap-2">
            {VA_CHANNELS.map((c) => (
              <label key={c.code} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${picked.includes(c.code) ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}>
                <input type="checkbox" className="size-4 accent-slate-900" checked={picked.includes(c.code)} onChange={(e) => toggle(c.code, e.target.checked)} />
                <span>
                  {c.label}
                  {c.min > minTotal && <span className="block text-[11px] text-amber-700">min. Rp{c.min.toLocaleString("id-ID")}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={test} loading={busy === "test"}>
            Uji ke Xendit
          </Button>
          <Button type="button" onClick={save} loading={busy === "save"} disabled={!dirty}>
            Simpan metode
          </Button>
          {testUrl && (
            <a href={testUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-sky-700 hover:underline">
              Buka halaman uji ↗
            </a>
          )}
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          Disarankan: klik <b>Uji ke Xendit</b> dulu, buka halaman uji untuk memastikan hanya Virtual Account yang tampil, lalu <b>Simpan</b>.
          Bila suatu saat bank yang dipilih ditolak Xendit, pesanan tetap dibuat dengan semua metode dan hal itu dicatat di riwayat pesanan.
        </p>
      </div>
    </Card>
  );
}
