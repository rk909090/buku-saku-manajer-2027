import "server-only";
import { after } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/lib/db";
import { SITE_ORIGIN } from "@/lib/shop/env";
import { getSettings, shipConfigOf } from "@/lib/shop/settings";
import { orderGreeting, waLink } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email/send";
import { CUSTOMER_EMAIL_LABEL, renderAdminNewOrder, renderCustomerEmail, shipInfo, type CustomerEmailKind, type EmailOrder } from "@/lib/email/templates";

/**
 * Notifikasi email pesanan. Dijadwalkan dengan `after()` (dijalankan setelah respons HTTP selesai)
 * sehingga checkout, webhook Xendit, dan aksi admin tidak tertunda. Hasil (terkirim/gagal/dilewati)
 * dicatat di riwayat pesanan (order_events, tipe "email").
 * Hanya boleh dipanggil dari Route Handler / Server Function (syarat `after`).
 */

export function queueCustomerEmail(orderId: number, kind: CustomerEmailKind) {
  after(() =>
    sendCustomerEmail(orderId, kind).catch((e) => console.error("[email] pelanggan", kind, orderId, (e as Error).message))
  );
}

export function queueAdminNewOrderEmail(orderId: number, paid: boolean) {
  after(() =>
    sendAdminNewOrder(orderId, paid).catch((e) => console.error("[email] admin", orderId, (e as Error).message))
  );
}

/** Daftar email penerima notifikasi admin dari pengaturan (dipisah koma). */
export function parseEmailList(raw: string) {
  return [...new Set(raw.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))];
}

async function logEvent(orderId: number, message: string) {
  await getPool().query("INSERT INTO order_events (order_id, type, message, actor) VALUES (?, 'email', ?, 'system')", [
    orderId,
    message.slice(0, 500),
  ]);
}

const etdId = (s: string | null) => (s ? s.replace(/days?/i, "hari").replace(/hours?/i, "jam") : null);

export async function loadEmailOrder(orderId: number): Promise<EmailOrder | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT o.*, c.name AS c_name, c.email AS c_email, c.phone AS c_phone
       FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ? LIMIT 1`,
    [orderId]
  );
  const o = rows[0];
  if (!o) return null;
  const [items] = await pool.query<RowDataPacket[]>(
    "SELECT name, quantity, unit_price, original_price FROM order_items WHERE order_id = ? ORDER BY id",
    [orderId]
  );
  const settings = await getSettings();
  return {
    id: Number(o.id),
    orderNumber: String(o.order_number),
    statusUrl: `${SITE_ORIGIN}/checkout/status?order=${o.order_number}&t=${o.public_token}`,
    adminUrl: `${SITE_ORIGIN}/admin/order?id=${o.id}`,
    createdAt: o.created_at,
    paidAt: o.paid_at || null,
    paymentUrl: o.status === "pending_payment" ? o.payment_link_url : null,
    paymentExpiresAt: o.payment_expires_at || null,
    customer: { name: String(o.c_name), email: String(o.c_email), phone: String(o.c_phone) },
    recipient: {
      name: String(o.recipient_name),
      phone: String(o.recipient_phone),
      address: String(o.address),
      areaName: String(o.area_name),
      postalCode: o.postal_code,
      notes: o.notes,
    },
    courier: `${o.courier_name} ${o.courier_service_name}`,
    etd: etdId(o.shipping_etd),
    trackingNumber: o.tracking_number,
    items: items.map((i) => ({
      name: String(i.name),
      qty: Number(i.quantity),
      unitPrice: Number(i.unit_price),
      originalPrice: i.original_price == null ? null : Number(i.original_price),
    })),
    subtotal: Number(o.subtotal),
    discountTotal: Number(o.discount_total || 0),
    couponCode: o.coupon_code,
    couponDiscount: Number(o.coupon_discount || 0),
    shippingCost: Number(o.shipping_cost),
    shippingDiscount: Number(o.shipping_discount || 0),
    total: Number(o.total),
    // Sapaan dari pengaturan + nomor pesanan, agar CS langsung tahu pesanan yang ditanyakan.
    whatsappUrl: waLink(settings.whatsapp_number, orderGreeting(settings.whatsapp_greeting, String(o.order_number))),
    ship: shipInfo(o.paid_at || null, shipConfigOf(settings)),
  };
}

async function sendCustomerEmail(orderId: number, kind: CustomerEmailKind) {
  const o = await loadEmailOrder(orderId);
  if (!o) return;
  const m = renderCustomerEmail(kind, o);
  const label = CUSTOMER_EMAIL_LABEL[kind];
  const r = await sendEmail({
    to: [o.customer.email],
    subject: m.subject,
    html: m.html,
    text: m.text,
    // Kunci unik per pesanan + jenis (+ resi) agar email yang sama tidak terkirim dua kali.
    idempotencyKey: `bsm-${o.orderNumber}-${kind}${kind === "tracking" ? `-${o.trackingNumber}` : ""}`,
    tags: [{ name: "type", value: `customer_${kind}` }],
  });
  await logEvent(
    orderId,
    r.ok ? `Email "${label}" terkirim ke ${o.customer.email}` : `Email "${label}" ${r.skipped ? "tidak dikirim" : "gagal"}: ${r.error}`
  );
}

async function sendAdminNewOrder(orderId: number, paid: boolean) {
  const settings = await getSettings();
  if (!paid && !settings.notify_on_pending) return;
  const to = parseEmailList(settings.notify_emails);
  if (to.length === 0) return;
  const o = await loadEmailOrder(orderId);
  if (!o) return;
  const m = renderAdminNewOrder(o, paid);
  const r = await sendEmail({
    to,
    subject: m.subject,
    html: m.html,
    text: m.text,
    idempotencyKey: `bsm-${o.orderNumber}-admin-${paid ? "paid" : "pending"}`,
    tags: [{ name: "type", value: paid ? "admin_paid" : "admin_pending" }],
  });
  await logEvent(
    orderId,
    r.ok
      ? `Notifikasi admin (${paid ? "dibayar" : "pesanan baru"}) terkirim ke ${to.length} alamat`
      : `Notifikasi admin ${r.skipped ? "tidak dikirim" : "gagal"}: ${r.error}`
  );
}
