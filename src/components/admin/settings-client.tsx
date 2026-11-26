"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, CircleAlert, CreditCard, Mail, MessageCircle, PlugZap, Plus, Trash2, Truck, type LucideIcon } from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { formatWhatsapp, MAX_WA_GREETING, normalizeGreeting, normalizeWhatsapp, orderGreeting, waLink } from "@/lib/whatsapp";
import { parseChannels, VA_CHANNELS } from "@/lib/shop/payment-channels";
import { AreaCombobox, type AreaValue } from "@/components/shop/area-combobox";
import {
  cutoffLabel,
  formatHolidayRange,
  formatShipDate,
  HOLIDAY_NOTICE_DAYS,
  isCutoff,
  isYmd,
  parseHolidays,
  shipScheduleFor,
  wib,
  type Holiday,
} from "@/lib/shop/shipping-schedule";
import { Alert, Badge, Button, Card, Field, inputCls, Loading, PageHeader } from "@/components/admin/ui";

type Settings = { origin_area_id: string; origin_area_name: string; origin_postal_code: string; couriers: string; max_qty_per_item: number; min_order_total: number; notify_emails: string; notify_on_pending: number; whatsapp_number: string; whatsapp_greeting: string; payment_channels: string; ship_cutoff: string; ship_holidays: string };
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

  // Tautan langsung ke bagian (mis. /admin/settings#kontak): isi baru ada setelah data dimuat,
  // jadi gulir ke bagian itu sekali setelah tampil.
  const loaded = !!d;
  useEffect(() => {
    if (!loaded) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  }, [loaded]);

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

  const sections: NavItem[] = [
    { id: "pengiriman", label: "Pengiriman", icon: Truck, attention: !d.settings.origin_area_id },
    { id: "jadwal-kirim", label: "Jadwal pengiriman", icon: CalendarClock },
    { id: "pembayaran", label: "Metode pembayaran", icon: CreditCard },
    { id: "kontak", label: "Kontak WhatsApp", icon: MessageCircle },
    { id: "notifikasi", label: "Notifikasi email", icon: Mail, attention: integ.resend === "missing" },
    { id: "integrasi", label: "Integrasi", icon: PlugZap, attention: [integ.xendit, integ.xenditWebhook, integ.biteship, integ.resend].includes("missing") },
  ];

  return (
    <>
      <PageHeader title="Pengaturan" subtitle="Pengiriman, jadwal kirim, pembayaran, kontak, dan notifikasi toko" />
      {/* Satu kolom konten + navigasi bagian (menempel saat digulir). Menggantikan grid 2 kolom yang tingginya timpang. */}
      <div className="lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-10">
        <SettingsNav items={sections} />
        <div className="min-w-0 max-w-3xl space-y-10">
          <SettingsSection id="pengiriman" title="Pengiriman" description="Lokasi asal paket, kurir yang ditawarkan di checkout, dan batas pesanan.">
            <Card>
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
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Maks. jumlah per produk" hint="Dalam satu pesanan.">
                    <input className={inputCls} inputMode="numeric" value={maxQty} onChange={(e) => setMaxQty(e.target.value.replace(/\D/g, ""))} />
                  </Field>
                  <Field label="Minimal total pembayaran (Rp)" hint="Diskon/kupon tidak menurunkan total di bawah angka ini.">
                    <input className={inputCls} inputMode="numeric" value={minTotal} onChange={(e) => setMinTotal(e.target.value.replace(/\D/g, ""))} />
                  </Field>
                </div>
                <p className="-mt-2 text-xs leading-relaxed text-slate-500">
                  Menurut tabel metode pembayaran Xendit: BCA VA & Alfamart/Indomaret min. Rp10.000, kartu Rp5.000, DANA/OVO Rp100, QRIS/ShopeePay/GoPay Rp1.
                  Bila minimal diturunkan di bawah Rp10.000, sebagian metode mungkin tidak bisa dipakai.
                </p>
                <div className="border-t border-slate-100 pt-4">
                  <Button type="submit" loading={busy}>Simpan pengiriman</Button>
                </div>
              </form>
            </Card>
          </SettingsSection>

          <SettingsSection id="jadwal-kirim" title="Jadwal pengiriman" description="Jam batas pengiriman harian dan libur pengiriman. Dipakai di checkout, halaman status, FAQ, email, dan daftar pesanan.">
            <ShippingScheduleCard initialCutoff={d.settings.ship_cutoff} initialHolidays={d.settings.ship_holidays} />
          </SettingsSection>

          <SettingsSection id="pembayaran" title="Metode pembayaran" description="Metode yang tampil di halaman pembayaran Xendit.">
            <PaymentChannelsCard initial={d.settings.payment_channels} minTotal={d.settings.min_order_total} />
          </SettingsSection>

          <SettingsSection id="kontak" title="Kontak WhatsApp" description="Nomor dan teks sapaan untuk tombol chat di landing page, checkout, dan email.">
            <WhatsappCard initial={d.settings.whatsapp_number} initialGreeting={d.settings.whatsapp_greeting || ""} />
          </SettingsSection>

          <SettingsSection id="notifikasi" title="Notifikasi email" description="Penerima notifikasi pesanan untuk admin, email uji, dan pratinjau desain email.">
            <NotificationCard
              emails={notifyEmails}
              setEmails={setNotifyEmails}
              pending={notifyPending}
              setPending={setNotifyPending}
              resendReady={integ.resend !== "missing"}
            />
          </SettingsSection>

          <SettingsSection id="integrasi" title="Integrasi" description="Kunci API (diisi di hPanel) dan webhook Xendit.">
            <Card>
              <ul className="-my-3 divide-y divide-slate-100">
                {row("Xendit secret key", integ.xendit, "XENDIT_SECRET_KEY")}
                {row("Xendit webhook token", integ.xenditWebhook, "XENDIT_WEBHOOK_TOKEN")}
                {row("Biteship API key", integ.biteship, "BITESHIP_API_KEY")}
                {row("Resend API key (email)", integ.resend, "RESEND_API_KEY")}
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                Nilai kunci tidak pernah ditampilkan. Isi/ubah di hPanel → Websites → bsm.humplus.com → Node.js → Environment variables.
              </p>
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-sm font-medium text-slate-800">Webhook Xendit</p>
                <p className="mt-1 text-sm text-slate-600">Daftarkan URL ini di dashboard Xendit (Settings → Webhooks) untuk event Payment Session:</p>
                <code className="mt-2 block rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs break-all text-slate-900">https://bsm.humplus.com/api/webhooks/xendit</code>
                <p className="mt-2 text-xs text-slate-500">Salin “Webhook verification token” dari halaman yang sama ke XENDIT_WEBHOOK_TOKEN.</p>
              </div>
            </Card>
          </SettingsSection>
        </div>
      </div>
    </>
  );
}

/* ───────────── Kerangka halaman pengaturan ───────────── */

type NavItem = { id: string; label: string; icon: LucideIcon; attention?: boolean };

function SettingsSection({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-36 lg:scroll-mt-8">
      <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-slate-500">{description}</p>
      {children}
    </section>
  );
}

/** Navigasi bagian: vertikal & menempel di desktop, deret tab yang bisa digeser di ponsel. Menandai bagian yang sedang dibaca. */
function SettingsNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id || "");
  const ids = items.map((i) => i.id).join(",");
  useEffect(() => {
    const els = ids.split(",").map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [ids]);

  // Ponsel: deret tab bisa digeser — pastikan tab aktif terlihat (tidak berpengaruh di desktop karena tidak meluap).
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const ul = listRef.current;
    const a = ul?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!ul || !a || ul.scrollWidth <= ul.clientWidth) return;
    const left = ul.scrollLeft + (a.getBoundingClientRect().left - ul.getBoundingClientRect().left) - 16;
    ul.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  return (
    <nav aria-label="Bagian pengaturan" className="sticky top-16 z-10 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:top-8 lg:mx-0 lg:mb-0 lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
      <ul ref={listRef} className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map((it) => {
          const on = active === it.id;
          return (
            <li key={it.id} className="shrink-0">
              <a
                href={`#${it.id}`}
                onClick={(e) => {
                  // Gulir eksplisit: klik pada hash yang sama dengan URL saat ini tidak selalu menggulir.
                  const el = document.getElementById(it.id);
                  if (!el) return;
                  e.preventDefault();
                  setActive(it.id);
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                  history.replaceState(null, "", `#${it.id}`);
                }}
                aria-current={on ? "true" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${on ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"}`}
              >
                <it.icon className={`size-4 ${on ? "text-slate-900" : "text-slate-400"}`} aria-hidden="true" />
                {it.label}
                {it.attention && <span className="ml-auto size-2 rounded-full bg-amber-500" aria-label="perlu dilengkapi" />}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ───────────── Jadwal pengiriman ───────────── */

type HolidayRow = Holiday & { key: number };
let rowSeq = 0;
const toRows = (h: Holiday[]): HolidayRow[] => h.map((x) => ({ ...x, key: ++rowSeq }));
const rowsKey = (cutoff: string, rows: Holiday[]) => JSON.stringify({ cutoff, rows: rows.map(({ start, end, label }) => ({ start, end, label: label.trim() })) });

function ShippingScheduleCard({ initialCutoff, initialHolidays }: { initialCutoff: string; initialHolidays: string }) {
  const [cutoff, setCutoff] = useState(initialCutoff);
  const [rows, setRows] = useState<HolidayRow[]>(() => toRows(parseHolidays(initialHolidays)));
  const [savedKey, setSavedKey] = useState(() => rowsKey(initialCutoff, parseHolidays(initialHolidays)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [now] = useState(() => Date.now());
  const today = wib(now).date;

  const rowError = (r: Holiday) =>
    !isYmd(r.start) || !isYmd(r.end) ? "Isi tanggal mulai & selesai" : r.end < r.start ? "Tanggal selesai sebelum tanggal mulai" : "";
  const invalid = !isCutoff(cutoff) || rows.some((r) => rowError(r));
  const dirty = rowsKey(cutoff, rows) !== savedKey;
  const preview = useMemo(
    () => (isCutoff(cutoff) ? shipScheduleFor(new Date(now), { cutoff, holidays: rows.filter((r) => !rowError(r)) }) : null),
    [cutoff, rows, now]
  );
  const update = (key: number, patch: Partial<Holiday>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function save() {
    if (invalid) return setMsg({ tone: "red", text: "Periksa kembali jam batas dan tanggal libur yang ditandai." });
    setBusy(true);
    setMsg(null);
    try {
      const j = await adminFetch<{ settings: Settings }>("/api/admin/settings/shipping", {
        method: "PUT",
        body: JSON.stringify({ ship_cutoff: cutoff, ship_holidays: rows.map(({ start, end, label }) => ({ start, end, label: label.trim() })) }),
      });
      const saved = parseHolidays(j.settings.ship_holidays);
      setCutoff(j.settings.ship_cutoff);
      setRows(toRows(saved));
      setSavedKey(rowsKey(j.settings.ship_cutoff, saved));
      setMsg({ tone: "green", text: "Jadwal pengiriman tersimpan dan langsung dipakai di checkout, email, dan dashboard." });
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="space-y-6">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

        <div className="grid gap-4 sm:grid-cols-[11rem_1fr] sm:items-start">
          <Field label="Jam batas harian">
            <input type="time" step={60} className={inputCls} value={cutoff} onChange={(e) => setCutoff(e.target.value)} required />
          </Field>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:mt-7">
            Pembayaran pada pukul <b className="text-slate-900">{isCutoff(cutoff) ? cutoffLabel(cutoff) : "—"}</b> atau setelahnya dikirim keesokan harinya.
            {preview && (
              <span className="mt-1 block text-xs text-slate-500">
                Contoh: bila dibayar sekarang, pesanan dijadwalkan dikirim <b className="text-slate-700">{formatShipDate(preview.date)}</b>.
              </span>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-slate-800">Libur pengiriman</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Akhir pekan & tanggal merah tetap dihitung hari kirim karena kurir beroperasi. Tambahkan periode di sini hanya bila tim tidak mengirim
                paket. Pesanan yang jadwalnya jatuh pada hari libur dikirim pada hari pertama setelah libur. Libur yang sedang berlangsung atau dimulai
                dalam {HOLIDAY_NOTICE_DAYS} hari diumumkan di checkout dan email pesanan.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setRows((rs) => [...rs, { start: today, end: today, label: "", key: ++rowSeq }])}>
              <Plus className="size-4" aria-hidden="true" /> Tambah libur
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-sm text-slate-500">Belum ada libur pengiriman.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {rows.map((r) => {
                const err = rowError(r);
                const state = err ? null : r.end < today ? { t: "Sudah lewat", c: "slate" as const } : r.start <= today ? { t: "Berlangsung", c: "amber" as const } : { t: "Akan datang", c: "blue" as const };
                return (
                  <li key={r.key} className={`rounded-xl border p-3 ${err ? "border-rose-300 bg-rose-50/40" : "border-slate-200"}`}>
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.3fr_auto] sm:items-end">
                      <Field label="Mulai">
                        <input type="date" className={inputCls} value={r.start} onChange={(e) => update(r.key, { start: e.target.value, ...(r.end < e.target.value ? { end: e.target.value } : {}) })} />
                      </Field>
                      <Field label="Selesai">
                        <input type="date" className={inputCls} value={r.end} min={r.start || undefined} onChange={(e) => update(r.key, { end: e.target.value })} />
                      </Field>
                      <Field label="Keterangan (opsional)">
                        <input className={inputCls} maxLength={60} value={r.label} placeholder="mis. Cuti bersama" onChange={(e) => update(r.key, { label: e.target.value })} />
                      </Field>
                      <button
                        type="button"
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                        className="inline-flex h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
                        aria-label={`Hapus libur ${r.start} sampai ${r.end}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" /> <span className="sm:hidden">Hapus</span>
                      </button>
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {err ? <span className="font-medium text-rose-700">{err}</span> : <>{state && <Badge tone={state.c}>{state.t}</Badge>} {formatHolidayRange(r)}</>}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <Button type="button" onClick={save} loading={busy} disabled={!dirty || invalid}>
            Simpan jadwal
          </Button>
          {dirty && !invalid && <span className="text-xs text-amber-700">Ada perubahan yang belum disimpan</span>}
        </div>
      </div>
    </Card>
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
    <Card>
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

const GREETING_EXAMPLE = "Halo Human Plus, saya ingin bertanya tentang Buku Saku Manajer.";

function WhatsappCard({ initial, initialGreeting }: { initial: string; initialGreeting: string }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [savedGreeting, setSavedGreeting] = useState(initialGreeting);
  const [greeting, setGreeting] = useState(initialGreeting);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const preview = normalizeWhatsapp(value);
  const cleanGreeting = normalizeGreeting(greeting);
  const tooLong = cleanGreeting.length > MAX_WA_GREETING;
  const dirty = (preview && preview !== saved) || cleanGreeting !== savedGreeting;
  // Tautan uji memakai isi formulir saat ini (boleh dicoba sebelum disimpan).
  const testNumber = preview || saved;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (tooLong) return setMsg({ tone: "red", text: `Teks sapaan maksimal ${MAX_WA_GREETING} karakter.` });
    setBusy(true);
    setMsg(null);
    try {
      const j = await adminFetch<{ settings: Settings }>("/api/admin/settings/contact", {
        method: "PUT",
        body: JSON.stringify({ whatsapp_number: value, whatsapp_greeting: greeting }),
      });
      setSaved(j.settings.whatsapp_number);
      setValue(j.settings.whatsapp_number);
      setSavedGreeting(j.settings.whatsapp_greeting || "");
      setGreeting(j.settings.whatsapp_greeting || "");
      setMsg({ tone: "green", text: "Kontak WhatsApp tersimpan dan langsung dipakai di website & email" });
    } catch (e2) {
      setMsg({ tone: "red", text: (e2 as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <form onSubmit={save} className="space-y-5">
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
        <p className="-mt-3 text-xs text-slate-500">
          {preview ? (
            <>
              Akan disimpan sebagai <b className="text-slate-800">{formatWhatsapp(preview)}</b>
            </>
          ) : (
            <span className="text-rose-700">Nomor belum valid (10–15 digit)</span>
          )}
        </p>

        <div className="border-t border-slate-100 pt-5">
          <div className="mb-1.5 flex items-end justify-between gap-3">
            <label htmlFor="wa-greeting" className="text-sm font-medium text-slate-700">
              Teks sapaan (pesan awal)
            </label>
            <span className={`text-xs tabular-nums ${tooLong ? "font-semibold text-rose-700" : "text-slate-500"}`}>
              {cleanGreeting.length}/{MAX_WA_GREETING}
            </span>
          </div>
          <textarea
            id="wa-greeting"
            rows={3}
            className={inputCls}
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder={GREETING_EXAMPLE}
            aria-describedby="wa-greeting-hint"
          />
          <p id="wa-greeting-hint" className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Teks ini sudah terisi di kolom ketik saat pembeli membuka chat — pembeli tinggal menekan kirim (masih bisa mengubahnya).
            Kosongkan bila tidak ingin memakai teks awal.
            {!greeting.trim() && (
              <>
                {" "}
                <button type="button" onClick={() => setGreeting(GREETING_EXAMPLE)} className="font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900">
                  Pakai contoh
                </button>
              </>
            )}
          </p>

          {/* Pratinjau: seperti pesan yang akan muncul di WhatsApp */}
          {cleanGreeting && !tooLong && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <WaPreview title="Dari tombol chat website & checkout" text={cleanGreeting} />
              <WaPreview title="Dari email pesanan (otomatis + nomor pesanan)" text={orderGreeting(cleanGreeting, "BSM261126ABC123")} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4">
          <Button type="submit" loading={busy} disabled={!preview || !dirty || tooLong}>
            Simpan kontak
          </Button>
          <a href={waLink(testNumber, tooLong ? "" : cleanGreeting)} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-emerald-700 hover:underline">
            Coba buka WhatsApp ({formatWhatsapp(testNumber)}) ↗
          </a>
          {dirty && <span className="text-xs text-amber-700">Ada perubahan yang belum disimpan</span>}
        </div>
      </form>
    </Card>
  );
}

/** Pratinjau gelembung pesan bergaya WhatsApp (baris baru dipertahankan). */
function WaPreview({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-[#efeae2] p-3">
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">{title}</p>
      <div className="ml-auto w-fit max-w-[95%] rounded-lg rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-900 shadow-sm">
        {text}
      </div>
    </div>
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
    <Card>
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
