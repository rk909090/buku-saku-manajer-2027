import { company, WHATSAPP_URL } from "@/lib/content";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { cutoffLabel, formatShipDate, publicShipNotes, scheduleSentence, shipScheduleFor, DEFAULT_SHIP_CONFIG, type ShipConfig, type ShipSchedule } from "@/lib/shop/shipping-schedule";

/**
 * Template email transaksional (HTML + teks). Ditulis dengan tabel & gaya inline agar tampil
 * konsisten di Gmail, Outlook, Apple Mail, dan aplikasi email ponsel. Semua data dinamis di-escape.
 */

export type EmailOrder = {
  id: number;
  orderNumber: string;
  statusUrl: string;
  adminUrl: string;
  createdAt: Date;
  paidAt: Date | null;
  paymentUrl: string | null;
  paymentExpiresAt: Date | null;
  customer: { name: string; email: string; phone: string };
  recipient: { name: string; phone: string; address: string; areaName: string; postalCode: string | null; notes: string | null };
  courier: string;
  etd: string | null;
  trackingNumber: string | null;
  items: { name: string; qty: number; unitPrice: number; originalPrice: number | null }[];
  subtotal: number;
  discountTotal: number;
  couponCode: string | null;
  couponDiscount: number;
  shippingCost: number;
  shippingDiscount: number;
  total: number;
  /** Tautan WhatsApp toko (dari pengaturan admin). */
  whatsappUrl: string;
  /** Info jadwal kirim (jam batas & libur dari pengaturan admin), lihat shipInfo(). */
  ship: ShipInfo;
};

export type ShipInfo = {
  /** Aturan jam batas + pengumuman libur terdekat (untuk pesanan yang belum dibayar). */
  notes: string[];
  /** Jadwal kirim bila sudah dibayar. */
  schedule: ShipSchedule | null;
  /** Kalimat untuk pelanggan bila pengiriman tidak di hari pembayaran (jam batas/libur), selain itu null. */
  scheduleText: string | null;
  cutoffLabel: string;
};

/** Hitung info jadwal kirim untuk email dari waktu bayar & pengaturan. */
export function shipInfo(paidAt: Date | null, cfg: ShipConfig, now: Date = new Date()): ShipInfo {
  const schedule = paidAt ? shipScheduleFor(paidAt, cfg) : null;
  return { notes: publicShipNotes(cfg, now), schedule, scheduleText: schedule ? scheduleSentence(schedule, cfg) : null, cutoffLabel: cutoffLabel(cfg.cutoff) };
}

export type CustomerEmailKind = "created" | "paid" | "processing" | "shipped" | "tracking" | "completed" | "cancelled" | "expired";

export const CUSTOMER_EMAIL_LABEL: Record<CustomerEmailKind, string> = {
  created: "Pesanan diterima (menunggu pembayaran)",
  paid: "Pembayaran diterima",
  processing: "Pesanan diproses",
  shipped: "Pesanan dikirim",
  tracking: "Nomor resi diperbarui",
  completed: "Pesanan selesai",
  cancelled: "Pesanan dibatalkan",
  expired: "Pembayaran kedaluwarsa",
};

const SITE = "https://bsm.humplus.com";
const C = {
  navy: "#0c1830",
  navyDeep: "#070f1d",
  gold: "#d4a246",
  goldLight: "#f0d08c",
  cream: "#faf6ee",
  page: "#f1ece2",
  ink: "#1a2232",
  muted: "#5b6577",
  line: "#e7e1d5",
  green: "#047857",
  red: "#b42318",
};
const FONT = "font-family:'Plus Jakarta Sans',Segoe UI,Helvetica,Arial,sans-serif;";

export const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const wib = (d: Date | null) => (d ? `${formatDateTime(d)} WIB` : "—");

const PILL: Record<string, { bg: string; fg: string }> = {
  amber: { bg: "#fef3c7", fg: "#92400e" },
  green: { bg: "#d1fae5", fg: "#065f46" },
  blue: { bg: "#e0f2fe", fg: "#075985" },
  violet: { bg: "#ede9fe", fg: "#5b21b6" },
  red: { bg: "#fee2e2", fg: "#991b1b" },
  slate: { bg: "#e2e8f0", fg: "#334155" },
};

/* ───────────── Kerangka ───────────── */

function layout(p: { preheader: string; pill: { text: string; tone: keyof typeof PILL }; title: string; intro: string; body: string; audience?: "customer" | "admin"; wa?: string }) {
  const wa = esc(p.wa || WHATSAPP_URL);
  const pill = PILL[p.pill.tone];
  const footer =
    p.audience === "admin"
      ? `Notifikasi otomatis dashboard Buku Saku Manajer. Atur penerima di Dashboard → Pengaturan → Notifikasi email.`
      : `Email ini dikirim otomatis dari alamat yang tidak dipantau — mohon tidak membalas. Ada pertanyaan? Hubungi kami lewat <a href="${wa}" style="color:${C.navy};font-weight:700;">WhatsApp</a>.`;
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(p.title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(p.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
    <tr><td align="center" style="padding:0 0 18px;">
      <a href="${SITE}" style="text-decoration:none;"><img src="${SITE}/images/logo-hpi.png" width="150" height="43" alt="Human Plus Institute" style="display:block;border:0;height:auto;max-width:150px;"></a>
    </td></tr>
    <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(12,24,48,0.08);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="background:${C.navy};background-image:linear-gradient(135deg,${C.navyDeep},${C.navy});padding:30px 32px 28px;${FONT}">
          <span style="display:inline-block;background:${pill.bg};color:${pill.fg};font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">${esc(p.pill.text)}</span>
          <h1 style="margin:14px 0 0;color:#ffffff;font-size:26px;line-height:1.25;font-weight:800;">${esc(p.title)}</h1>
          <p style="margin:10px 0 0;color:#cfd6e4;font-size:15px;line-height:1.6;">${p.intro}</p>
        </td></tr>
        <tr><td style="height:4px;background:${C.gold};background-image:linear-gradient(90deg,${C.gold},${C.goldLight},${C.gold});font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px 32px 32px;${FONT}color:${C.ink};font-size:15px;line-height:1.6;">${p.body}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:22px 16px 0;${FONT}color:${C.muted};font-size:12px;line-height:1.6;text-align:center;">
      ${footer}<br><br>
      <strong style="color:${C.ink};">${esc(company.name)}</strong><br>${esc(company.address)}<br>${esc(company.phone)}<br>
      <a href="${SITE}" style="color:${C.muted};">bsm.humplus.com</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px;"><tr><td style="border-radius:999px;background:${C.gold};background-image:linear-gradient(180deg,#e5bb63,${C.gold});">
  <a href="${esc(href)}" style="display:inline-block;padding:14px 30px;${FONT}font-size:16px;font-weight:800;color:${C.navyDeep};text-decoration:none;border-radius:999px;">${esc(label)} &rarr;</a></td></tr></table>`;

const p = (html: string) => `<p style="margin:0 0 14px;">${html}</p>`;
const h2 = (t: string) => `<h2 style="margin:26px 0 10px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:${C.muted};font-weight:800;">${esc(t)}</h2>`;

function summary(o: EmailOrder) {
  const rows = o.items
    .map(
      (i) => `<tr>
      <td style="padding:12px 0;border-bottom:1px solid ${C.line};vertical-align:top;">
        <img src="${SITE}/images/buku/sampul-depan.jpg" width="44" alt="" style="display:block;border:0;border-radius:4px;">
      </td>
      <td style="padding:12px 12px;border-bottom:1px solid ${C.line};vertical-align:top;">
        <div style="font-weight:700;color:${C.ink};">${esc(i.name)}</div>
        <div style="color:${C.muted};font-size:13px;">${i.originalPrice != null ? `<s>${formatRupiah(i.originalPrice)}</s> ` : ""}${formatRupiah(i.unitPrice)} × ${i.qty}</div>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};vertical-align:top;font-weight:700;white-space:nowrap;">${formatRupiah(i.unitPrice * i.qty)}</td>
    </tr>`
    )
    .join("");
  const line = (k: string, v: string, color = C.ink) =>
    `<tr><td style="padding:4px 0;color:${C.muted};">${k}</td><td align="right" style="padding:4px 0;color:${color};font-weight:600;white-space:nowrap;">${v}</td></tr>`;
  return `${h2(`Ringkasan pesanan ${o.orderNumber}`)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;">${rows}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;margin-top:10px;">
    ${line("Subtotal", formatRupiah(o.subtotal))}
    ${o.couponDiscount > 0 ? line(`Kupon ${esc(o.couponCode)}`, `&minus;${formatRupiah(o.couponDiscount)}`, C.green) : ""}
    ${line(`Ongkos kirim (${esc(o.courier)})`, formatRupiah(o.shippingCost))}
    ${o.shippingDiscount > 0 ? line("Potongan ongkir", `&minus;${formatRupiah(o.shippingDiscount)}`, C.green) : ""}
    <tr><td colspan="2" style="padding:8px 0 0;border-top:1px solid ${C.line};"></td></tr>
    <tr><td style="padding:2px 0;font-weight:800;color:${C.ink};font-size:15px;">Total</td><td align="right" style="padding:2px 0;font-weight:800;color:${C.navy};font-size:20px;white-space:nowrap;">${formatRupiah(o.total)}</td></tr>
  </table>`;
}

function shipping(o: EmailOrder) {
  return `${h2("Dikirim ke")}
  <div style="background:${C.cream};border-radius:14px;padding:16px 18px;font-size:14px;line-height:1.6;">
    <strong>${esc(o.recipient.name)}</strong> · ${esc(o.recipient.phone)}<br>
    ${esc(o.recipient.address)}<br>${esc(o.recipient.areaName)}${o.recipient.postalCode ? ` ${esc(o.recipient.postalCode)}` : ""}
    ${o.recipient.notes ? `<br><span style="color:${C.muted};">Catatan: ${esc(o.recipient.notes)}</span>` : ""}
    <br><span style="color:${C.muted};">Kurir: ${esc(o.courier)}${o.etd ? ` · estimasi ${esc(o.etd)}` : ""}</span>
  </div>`;
}

/** Kotak info kecil (mis. batas jam pengiriman). `html` harus sudah aman (tidak berisi data pengguna mentah). */
const infoNote = (html: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 14px;"><tr><td style="background:${C.cream};border-left:4px solid ${C.gold};border-radius:10px;padding:12px 16px;font-size:14px;line-height:1.55;color:${C.ink};">${html}</td></tr></table>`;

/** Kalimat jadwal kirim untuk pesanan yang sudah dibayar: tanggal pasti bila tidak dikirim di hari pembayaran. */
const shipSchedule = (o: EmailOrder) => o.ship.scheduleText || o.ship.notes[0];

/** Catatan jadwal kirim untuk admin (selalu menyebut tanggal). */
function adminShipLine(o: EmailOrder) {
  const s = o.ship.schedule;
  if (!s) return null;
  const why = s.holiday
    ? `libur pengiriman${s.holiday.label ? ` (${s.holiday.label})` : ""}`
    : s.afterCutoff
      ? `dibayar di atas pukul ${o.ship.cutoffLabel}`
      : "dibayar sebelum jam batas";
  return `${formatShipDate(s.date)}${s.date === s.paidDate ? " (hari pembayaran)" : ""} — ${why}`;
}

function trackingBox(o: EmailOrder) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;"><tr><td style="background:${C.cream};border:1px solid ${C.line};border-left:4px solid ${C.gold};border-radius:12px;padding:16px 18px;">
    <div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:${C.muted};font-weight:800;">Nomor resi · ${esc(o.courier)}</div>
    <div style="margin-top:6px;font-family:Consolas,Menlo,monospace;font-size:24px;font-weight:800;letter-spacing:.06em;color:${C.navy};">${esc(o.trackingNumber || "—")}</div>
    <div style="margin-top:6px;font-size:13px;color:${C.muted};">Lacak paket dengan nomor ini di situs atau aplikasi resmi kurir.</div>
  </td></tr></table>`;
}

/* ───────────── Email pelanggan ───────────── */

export function renderCustomerEmail(kind: CustomerEmailKind, o: EmailOrder) {
  const first = esc(o.customer.name.split(/\s+/)[0] || o.customer.name);
  const wa = esc(o.whatsappUrl);
  const statusLink = `<p style="margin:14px 0 0;font-size:13px;color:${C.muted};">Status pesanan bisa dicek kapan saja di <a href="${esc(o.statusUrl)}" style="color:${C.navy};font-weight:700;">halaman pesanan Anda</a>.</p>`;
  let subject = "";
  let pill: { text: string; tone: keyof typeof PILL };
  let title = "";
  let intro = "";
  let body = "";
  let textLines: string[] = [];

  switch (kind) {
    case "created":
      subject = `Pesanan ${o.orderNumber} diterima — selesaikan pembayaran`;
      pill = { text: "Menunggu pembayaran", tone: "amber" };
      title = "Terima kasih, pesanan Anda kami terima";
      intro = `Halo ${first}, satu langkah lagi: selesaikan pembayaran agar pesanan bisa kami proses.`;
      body =
        p(`Silakan bayar <strong>${formatRupiah(o.total)}</strong>${o.paymentExpiresAt ? ` sebelum <strong>${wib(o.paymentExpiresAt)}</strong>` : ""}. Lewat dari batas waktu, pesanan dibatalkan otomatis.`) +
        (o.paymentUrl ? button(o.paymentUrl, "Bayar Sekarang") : "") +
        statusLink +
        `<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>` +
        infoNote(`<strong>Info pengiriman:</strong> ${o.ship.notes.map(esc).join("<br>")}`) +
        summary(o) +
        shipping(o);
      textLines = [`Selesaikan pembayaran ${formatRupiah(o.total)}${o.paymentExpiresAt ? ` sebelum ${wib(o.paymentExpiresAt)}` : ""}.`, o.paymentUrl ? `Bayar: ${o.paymentUrl}` : "", ...o.ship.notes.map((n) => `Info pengiriman: ${n}`)];
      break;
    case "paid":
      subject = `Pembayaran pesanan ${o.orderNumber} diterima`;
      pill = { text: "Pembayaran diterima", tone: "green" };
      title = "Pembayaran berhasil 🎉";
      intro = `Halo ${first}, pembayaran Anda sudah kami terima${o.paidAt ? ` pada ${wib(o.paidAt)}` : ""}.`;
      body =
        p("Pesanan Anda segera kami siapkan. Kami akan mengirim email lagi beserta nomor resi saat paket dikirim.") +
        infoNote(`<strong>Jadwal pengiriman:</strong> ${esc(shipSchedule(o))}`) +
        button(o.statusUrl, "Lihat Status Pesanan") +
        summary(o) +
        shipping(o);
      textLines = ["Pembayaran Anda sudah kami terima. Kami akan mengirim nomor resi saat paket dikirim.", `Jadwal pengiriman: ${shipSchedule(o)}`];
      break;
    case "processing":
      subject = `Pesanan ${o.orderNumber} sedang dikemas`;
      pill = { text: "Sedang diproses", tone: "violet" };
      title = "Pesanan Anda sedang dikemas";
      intro = `Halo ${first}, tim kami sedang menyiapkan Buku Saku Manajer untuk Anda.`;
      body = p("Begitu paket diserahkan ke kurir, Anda akan menerima email berisi nomor resi.") + button(o.statusUrl, "Lihat Status Pesanan") + summary(o) + shipping(o);
      textLines = ["Pesanan Anda sedang dikemas. Nomor resi akan dikirim saat paket diserahkan ke kurir."];
      break;
    case "shipped":
    case "tracking":
      subject = kind === "shipped" ? `Pesanan ${o.orderNumber} sudah dikirim — resi ${o.trackingNumber}` : `Nomor resi pesanan ${o.orderNumber} diperbarui`;
      pill = { text: kind === "shipped" ? "Dalam pengiriman" : "Resi diperbarui", tone: "blue" };
      title = kind === "shipped" ? "Paket Anda sedang dalam perjalanan" : "Nomor resi pesanan diperbarui";
      intro =
        kind === "shipped"
          ? `Halo ${first}, pesanan Anda sudah kami serahkan ke ${esc(o.courier)}.`
          : `Halo ${first}, berikut nomor resi terbaru untuk pesanan Anda.`;
      body = trackingBox(o) + button(o.statusUrl, "Lihat Status Pesanan") + shipping(o) + summary(o);
      textLines = [`Kurir: ${o.courier}`, `Nomor resi: ${o.trackingNumber || "—"}`];
      break;
    case "completed":
      subject = `Pesanan ${o.orderNumber} selesai — terima kasih!`;
      pill = { text: "Selesai", tone: "green" };
      title = "Terima kasih telah berbelanja";
      intro = `Halo ${first}, pesanan Anda telah selesai. Semoga Buku Saku Manajer membantu Anda memimpin tim dengan lebih terarah.`;
      body = p(`Ada pertanyaan tentang pesanan atau isi buku? Kami siap membantu lewat <a href="${wa}" style="color:${C.navy};font-weight:700;">WhatsApp</a>.`) + summary(o);
      textLines = ["Pesanan Anda telah selesai. Terima kasih!"];
      break;
    case "cancelled":
      subject = `Pesanan ${o.orderNumber} dibatalkan`;
      pill = { text: "Dibatalkan", tone: "red" };
      title = "Pesanan Anda dibatalkan";
      intro = `Halo ${first}, pesanan ${esc(o.orderNumber)} telah dibatalkan.`;
      body = p(`Jika Anda sudah melakukan pembayaran atau merasa ini keliru, silakan hubungi kami lewat <a href="${wa}" style="color:${C.navy};font-weight:700;">WhatsApp</a> dengan menyebutkan nomor pesanan.`) + summary(o);
      textLines = ["Pesanan Anda telah dibatalkan. Jika sudah membayar atau merasa keliru, hubungi kami lewat WhatsApp."];
      break;
    case "expired":
      subject = `Batas waktu pembayaran pesanan ${o.orderNumber} telah lewat`;
      pill = { text: "Kedaluwarsa", tone: "slate" };
      title = "Batas waktu pembayaran telah lewat";
      intro = `Halo ${first}, pembayaran untuk pesanan ${esc(o.orderNumber)} tidak kami terima sampai batas waktunya, sehingga pesanan dibatalkan otomatis.`;
      body = p("Masih ingin memiliki Buku Saku Manajer? Anda bisa memesan lagi kapan saja.") + button(`${SITE}/checkout?add=buku-saku-manajer`, "Pesan Lagi") + summary(o);
      textLines = ["Batas waktu pembayaran telah lewat; pesanan dibatalkan otomatis.", `Pesan lagi: ${SITE}/checkout?add=buku-saku-manajer`];
      break;
  }

  const html = layout({ preheader: `${title} · ${o.orderNumber}`, pill: pill!, title, intro, body, wa: o.whatsappUrl });
  const text = [
    `${title} — ${o.orderNumber}`,
    "",
    `Halo ${o.customer.name},`,
    ...textLines.filter(Boolean),
    "",
    ...o.items.map((i) => `- ${i.name} × ${i.qty}: ${formatRupiah(i.unitPrice * i.qty)}`),
    ...(o.couponDiscount ? [`Kupon ${o.couponCode}: -${formatRupiah(o.couponDiscount)}`] : []),
    `Ongkos kirim (${o.courier}): ${formatRupiah(o.shippingCost)}${o.shippingDiscount ? ` (potongan -${formatRupiah(o.shippingDiscount)})` : ""}`,
    `Total: ${formatRupiah(o.total)}`,
    "",
    `Status pesanan: ${o.statusUrl}`,
    `WhatsApp: ${o.whatsappUrl}`,
    "",
    `${company.name} · bsm.humplus.com`,
  ].join("\n");
  return { subject, html, text };
}

/* ───────────── Email admin ───────────── */

export function renderAdminNewOrder(o: EmailOrder, paid: boolean) {
  const wa = o.customer.phone.replace(/^\+/, "");
  const subject = paid ? `🛒 Pesanan baru dibayar: ${o.orderNumber} — ${formatRupiah(o.total)}` : `Pesanan baru (menunggu bayar): ${o.orderNumber} — ${formatRupiah(o.total)}`;
  const body =
    p(paid ? `Pembayaran <strong>${formatRupiah(o.total)}</strong> diterima${o.paidAt ? ` pada ${wib(o.paidAt)}` : ""}. Pesanan siap diproses.` : `Pesanan dibuat ${wib(o.createdAt)} dan <strong>belum dibayar</strong>.`) +
    (paid && adminShipLine(o) ? infoNote(`<strong>Jadwal kirim:</strong> ${esc(adminShipLine(o))}`) : "") +
    button(o.adminUrl, "Buka di Dashboard") +
    h2("Pelanggan") +
    `<div style="background:${C.cream};border-radius:14px;padding:16px 18px;font-size:14px;line-height:1.7;">
      <strong>${esc(o.customer.name)}</strong><br>
      <a href="mailto:${esc(o.customer.email)}" style="color:${C.navy};">${esc(o.customer.email)}</a><br>
      <a href="https://wa.me/${esc(wa)}" style="color:${C.green};font-weight:700;">WhatsApp ${esc(o.customer.phone)}</a>
    </div>` +
    shipping(o) +
    summary(o);
  const html = layout({
    preheader: `${o.customer.name} · ${formatRupiah(o.total)} · ${o.courier}`,
    pill: paid ? { text: "Pesanan baru · dibayar", tone: "green" } : { text: "Pesanan baru · belum dibayar", tone: "amber" },
    title: paid ? "Ada pesanan baru yang sudah dibayar" : "Ada pesanan baru",
    intro: `${esc(o.orderNumber)} · ${esc(o.customer.name)} · ${formatRupiah(o.total)}`,
    body,
    audience: "admin",
  });
  const text = [
    subject,
    "",
    `Pelanggan: ${o.customer.name} · ${o.customer.email} · ${o.customer.phone}`,
    `Kirim ke: ${o.recipient.name}, ${o.recipient.address}, ${o.recipient.areaName}`,
    `Kurir: ${o.courier}`,
    ...(paid && adminShipLine(o) ? [`Jadwal kirim: ${adminShipLine(o)}`] : []),
    ...o.items.map((i) => `- ${i.name} × ${i.qty}`),
    `Total: ${formatRupiah(o.total)}`,
    "",
    `Dashboard: ${o.adminUrl}`,
  ].join("\n");
  return { subject, html, text };
}

export function renderTestEmail() {
  const html = layout({
    preheader: "Email uji dari dashboard Buku Saku Manajer",
    pill: { text: "Email uji", tone: "blue" },
    title: "Pengiriman email berfungsi ✅",
    intro: "Email ini dikirim dari Dashboard → Pengaturan untuk memastikan Resend sudah terhubung.",
    body: p("Jika Anda menerima email ini, notifikasi pesanan untuk pelanggan dan admin siap dikirim dari alamat pengirim yang sama.") + button(`${SITE}/admin/settings`, "Buka Pengaturan"),
    audience: "admin",
  });
  return { subject: "Email uji — Buku Saku Manajer", html, text: "Pengiriman email dari dashboard Buku Saku Manajer berfungsi." };
}

/** Data contoh untuk pratinjau desain di dashboard (bukan data pelanggan). */
export function sampleOrder(): EmailOrder {
  const now = new Date();
  return {
    id: 0,
    orderNumber: "BSM261117ABC123",
    statusUrl: `${SITE}/checkout/status`,
    adminUrl: `${SITE}/admin/orders`,
    createdAt: now,
    paidAt: now,
    paymentUrl: `${SITE}/checkout`,
    paymentExpiresAt: new Date(now.getTime() + 24 * 3600_000),
    customer: { name: "Budi Santoso", email: "budi@contoh.id", phone: "+6281234567890" },
    recipient: { name: "Budi Santoso", phone: "+6281234567890", address: "Jl. Contoh No. 10, RT 01/RW 02, Kel. Contoh", areaName: "Setiabudi, Jakarta Selatan, DKI Jakarta", postalCode: "12920", notes: null },
    courier: "J&T EZ",
    etd: "2 - 3 hari",
    trackingNumber: "JP1234567890",
    items: [{ name: "Buku Saku Manajer — Edisi Kedua", qty: 1, unitPrice: 120000, originalPrice: null }],
    subtotal: 120000,
    discountTotal: 0,
    couponCode: null,
    couponDiscount: 0,
    shippingCost: 14000,
    shippingDiscount: 0,
    total: 134000,
    whatsappUrl: WHATSAPP_URL,
    ship: shipInfo(now, DEFAULT_SHIP_CONFIG, now),
  };
}
