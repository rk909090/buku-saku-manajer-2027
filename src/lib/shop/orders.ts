import "server-only";
import { randomBytes } from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { ensureSchema, getPool } from "@/lib/db";
import { getSettings } from "@/lib/shop/settings";
import { getRates, type RateOption } from "@/lib/shop/biteship";
import { createPaymentSession, getPaymentSession, type CreateSessionInput } from "@/lib/shop/xendit";
import { SITE_ORIGIN } from "@/lib/shop/env";
import { activeDiscounts, applyMinimumTotal, bestDiscount, evaluateCoupon, type CouponQuote } from "@/lib/shop/promo";
import { paymentLines } from "@/lib/shop/pricing";
import { formatRupiah } from "@/lib/format";

export type Product = {
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

import { ShopError } from "@/lib/shop/errors";
export { ShopError };

export async function listProducts(onlyActive = true): Promise<Product[]> {
  await ensureSchema();
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, slug, name, price, weight_g, length_cm, width_cm, height_cm, stock, image_url, active
       FROM products ${onlyActive ? "WHERE active = 1" : ""} ORDER BY id`
  );
  return rows.map((r) => ({
    ...(r as Product),
    length_cm: r.length_cm == null ? null : Number(r.length_cm),
    width_cm: r.width_cm == null ? null : Number(r.width_cm),
    height_cm: r.height_cm == null ? null : Number(r.height_cm),
  }));
}

export type CartLine = { slug: string; qty: number };

/**
 * Validasi keranjang terhadap DB: harga, diskon aktif, stok, berat. Harga dari browser tidak dipakai.
 * `unitPrice` = harga setelah diskon produk; `subtotal` = jumlah unitPrice × qty.
 */
export async function priceCart(lines: CartLine[]) {
  const settings = await getSettings();
  const products = await listProducts(true);
  const discounts = await activeDiscounts();
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.slug, (merged.get(l.slug) || 0) + l.qty);
  if (merged.size === 0) throw new ShopError("Keranjang kosong");

  const items = [...merged].map(([slug, qty]) => {
    const p = bySlug.get(slug);
    if (!p) throw new ShopError("Produk tidak tersedia");
    if (!Number.isInteger(qty) || qty < 1 || qty > settings.max_qty_per_item)
      throw new ShopError(`Jumlah per produk 1–${settings.max_qty_per_item}`);
    if (p.stock != null && p.stock < qty) throw new ShopError(`Stok ${p.name} tidak cukup (tersisa ${Math.max(0, p.stock)})`);
    const best = bestDiscount(p.price, p.id, discounts);
    const unitPrice = p.price - (best?.amount || 0);
    return { product: p, qty, unitPrice, discountName: best?.discount.name || null, lineTotal: unitPrice * qty };
  });
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const discountTotal = items.reduce((s, i) => s + (i.product.price - i.unitPrice) * i.qty, 0);
  return { items, subtotal, discountTotal, settings };
}

export function shippingReady(products: Product[], s: { origin_area_id: string; couriers: string }) {
  if (!s.origin_area_id) return { ok: false, reason: "Lokasi asal pengiriman belum diatur admin" };
  if (!s.couriers) return { ok: false, reason: "Daftar kurir belum diatur admin" };
  const missing = products.filter((p) => !p.weight_g);
  if (missing.length) return { ok: false, reason: "Berat produk belum diatur admin" };
  return { ok: true as const, reason: "" };
}

export async function ratesForCart(lines: CartLine[], destinationAreaId: string): Promise<RateOption[]> {
  const { items, settings } = await priceCart(lines);
  const ready = shippingReady(items.map((i) => i.product), settings);
  if (!ready.ok) throw new ShopError(ready.reason, 503);
  return getRates({
    originAreaId: settings.origin_area_id,
    destinationAreaId,
    couriers: settings.couriers,
    items: items.map((i) => ({
      name: i.product.name,
      value: i.product.price,
      weight: i.product.weight_g!,
      quantity: i.qty,
      ...(i.product.length_cm ? { length: i.product.length_cm } : {}),
      ...(i.product.width_cm ? { width: i.product.width_cm } : {}),
      ...(i.product.height_cm ? { height: i.product.height_cm } : {}),
    })),
  });
}

/** +62… (E.164) dari 08…, 628…, atau +628…  */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0")) d = "62" + d.slice(1);
  if (!d.startsWith("62")) return null;
  if (d.length < 10 || d.length > 15) return null;
  return "+" + d;
}

function orderNumber() {
  const now = new Date(Date.now() + 7 * 3600 * 1000); // WIB
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `BSM${ymd}${rand}`;
}

export type CreateOrderInput = {
  lines: CartLine[];
  customer: { name: string; email: string; phone: string };
  shipping: { recipientName: string; recipientPhone: string; address: string; areaId: string; areaName: string; postalCode: string | null; notes: string | null };
  courier: { code: string; serviceCode: string };
  couponCode: string | null;
  abVariant: string | null;
  visitorId: string | null;
};

async function addEvent(conn: PoolConnection | ReturnType<typeof getPool>, orderId: number, type: string, message: string, actor: string | null = null) {
  await conn.query("INSERT INTO order_events (order_id, type, message, actor) VALUES (?, ?, ?, ?)", [orderId, type, message, actor]);
}

export async function createOrder(input: CreateOrderInput) {
  const { items, subtotal, discountTotal, settings } = await priceCart(input.lines);
  const rates = await ratesForCart(input.lines, input.shipping.areaId);
  const rate = rates.find((r) => r.courier_code === input.courier.code && r.courier_service_code === input.courier.serviceCode);
  if (!rate) throw new ShopError("Pilihan kurir tidak tersedia lagi, silakan pilih ulang", 409);

  const phone = normalizePhone(input.customer.phone);
  const recipientPhone = normalizePhone(input.shipping.recipientPhone);
  if (!phone || !recipientPhone) throw new ShopError("Nomor WhatsApp tidak valid (contoh: 0812xxxxxxx)");
  const email = input.customer.email.trim().toLowerCase();

  const pool = getPool();
  const conn = await pool.getConnection();
  let orderId = 0;
  let number = "";
  const token = randomBytes(16).toString("hex");
  let customerId = 0;
  let quote: CouponQuote | null = null;
  let couponDiscount = 0;
  let shippingDiscount = 0;
  let total = 0;
  try {
    await conn.beginTransaction();
    // Kupon dikunci (FOR UPDATE) sampai transaksi selesai agar kuota tidak terlampaui.
    if (input.couponCode) {
      quote = await evaluateCoupon(conn, input.couponCode, { subtotal, shippingCost: rate.price, email, lock: true });
    }
    const m = applyMinimumTotal({
      subtotal,
      couponDiscount: quote?.discount || 0,
      shipping: rate.price,
      shippingDiscount: quote?.shippingDiscount || 0,
      min: settings.min_order_total,
    });
    if (m.belowMinimum) throw new ShopError(`Total pembayaran minimal ${formatRupiah(settings.min_order_total)}`, 422);
    ({ couponDiscount, shippingDiscount, total } = m);

    await conn.query(
      `INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), id = LAST_INSERT_ID(id)`,
      [input.customer.name.trim(), email, phone]
    );
    const [cid] = await conn.query<RowDataPacket[]>("SELECT LAST_INSERT_ID() AS id");
    customerId = Number(cid[0].id);

    for (let attempt = 0; attempt < 5; attempt++) {
      number = orderNumber();
      try {
        const [r] = await conn.query<ResultSetHeader>(
          `INSERT INTO orders (order_number, public_token, customer_id, status, subtotal, discount_total,
              coupon_id, coupon_code, coupon_discount, shipping_cost, shipping_discount, total,
              courier_code, courier_service_code, courier_name, courier_service_name, shipping_etd,
              recipient_name, recipient_phone, address, area_id, area_name, postal_code, notes, ab_variant, visitor_id)
           VALUES (?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            number, token, customerId, subtotal, discountTotal,
            quote?.coupon.id ?? null, quote?.coupon.code ?? null, couponDiscount, rate.price, shippingDiscount, total,
            rate.courier_code, rate.courier_service_code, rate.courier_name, rate.courier_service_name, rate.etd || null,
            input.shipping.recipientName.trim(), recipientPhone, input.shipping.address.trim(),
            input.shipping.areaId, input.shipping.areaName, input.shipping.postalCode, input.shipping.notes,
            input.abVariant, input.visitorId,
          ]
        );
        orderId = r.insertId;
        break;
      } catch (e) {
        if ((e as { code?: string }).code !== "ER_DUP_ENTRY" || attempt === 4) throw e;
      }
    }
    for (const i of items) {
      const discounted = i.unitPrice < i.product.price;
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, name, unit_price, original_price, discount_name, quantity, weight_g)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, i.product.id, i.product.name, i.unitPrice, discounted ? i.product.price : null, discounted ? i.discountName : null, i.qty, i.product.weight_g || 0]
      );
    }
    const promoNote = [
      discountTotal ? `diskon produk ${formatRupiah(discountTotal)}` : "",
      quote ? `kupon ${quote.coupon.code} −${formatRupiah(couponDiscount + shippingDiscount)}${m.limited ? " (dibatasi minimal total)" : ""}` : "",
    ].filter(Boolean).join(", ");
    await addEvent(conn, orderId, "created", `Pesanan dibuat. Total ${formatRupiah(total)}${promoNote ? ` (${promoNote})` : ""}`);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  // Sesi pembayaran Xendit (di luar transaksi DB).
  const [given, ...rest] = input.customer.name.trim().split(/\s+/);
  const statusUrl = `${SITE_ORIGIN}/checkout/status?order=${number}&t=${token}`;
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
  try {
    // Xendit tidak punya tipe item "diskon" (dokumentasi create-session), jadi potongan dimasukkan ke harga
    // item: jumlah item selalu sama persis dengan `amount`.
    const pl = paymentLines(items, couponDiscount);
    const xItems: CreateSessionInput["items"] = [];
    items.forEach((i, k) => {
      const l = pl[k];
      if (l.amount <= 0) return;
      const tag = l.couponCut > 0 ? ` (kupon ${quote!.coupon.code})` : i.discountName ? ` (${i.discountName})` : "";
      xItems.push({
        referenceId: `prod${i.product.id}`,
        type: "PHYSICAL_PRODUCT",
        name: `${i.product.name}${l.split ? ` × ${i.qty}` : ""}${tag}`.slice(0, 255),
        category: "Buku",
        netUnitAmount: l.unit,
        quantity: l.quantity,
      });
    });
    const shipNet = rate.price - shippingDiscount;
    if (shipNet > 0) {
      xItems.push({
        referenceId: "shipping",
        type: "FEE",
        name: `Ongkos kirim ${rate.courier_name} ${rate.courier_service_name}${shippingDiscount ? " (setelah potongan)" : ""}`.slice(0, 255),
        category: "Pengiriman",
        netUnitAmount: shipNet,
        quantity: 1,
      });
    }
    const itemsSum = xItems.reduce((s, x) => s + x.netUnitAmount * x.quantity, 0);
    if (itemsSum !== total) throw new Error(`Jumlah item (${itemsSum}) tidak sama dengan total (${total})`);

    const session = await createPaymentSession({
      referenceId: number,
      amount: total,
      description: `Pesanan ${number} — Buku Saku Manajer${quote ? ` · kupon ${quote.coupon.code}` : ""}`,
      customer: {
        referenceId: `cust${customerId}`,
        email,
        mobileNumber: phone,
        givenNames: given,
        surname: rest.join(" ") || undefined,
      },
      items: xItems,
      successReturnUrl: statusUrl,
      cancelReturnUrl: statusUrl,
      expiresAt,
    });
    await pool.query(
      "UPDATE orders SET xendit_session_id = ?, payment_link_url = ?, payment_expires_at = ? WHERE id = ?",
      [session.payment_session_id, session.payment_link_url, session.expires_at ? new Date(session.expires_at) : expiresAt, orderId]
    );
    await addEvent(pool, orderId, "payment_link", `Link pembayaran Xendit dibuat (${session.payment_session_id})`);
    return { orderNumber: number, token, paymentLinkUrl: session.payment_link_url, total };
  } catch (e) {
    await pool.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId]);
    await addEvent(pool, orderId, "payment_error", `Gagal membuat pembayaran: ${(e as Error).message}`.slice(0, 500));
    throw new ShopError("Gagal menyiapkan pembayaran. Silakan coba lagi beberapa saat lagi.", 502);
  }
}

/**
 * Tandai pesanan lunas — HANYA setelah status dikonfirmasi langsung ke Xendit (GET /sessions).
 * Idempoten: aman dipanggil berkali-kali (webhook ganda, polling halaman status).
 */
export async function confirmPaymentFromXendit(sessionId: string, source: string) {
  await ensureSchema();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, order_number, total, status FROM orders WHERE xendit_session_id = ? LIMIT 1",
    [sessionId]
  );
  const order = rows[0];
  if (!order) return { ok: false, reason: "order_not_found" } as const;

  const s = await getPaymentSession(sessionId);
  if (s.reference_id !== order.order_number) return { ok: false, reason: "reference_mismatch" } as const;

  if (s.status === "COMPLETED") {
    if (Number(s.amount) !== Number(order.total) || String(s.currency).toUpperCase() !== "IDR") {
      await addEvent(pool, order.id, "payment_mismatch", `Nominal/mata uang tidak cocok: ${s.amount} ${s.currency}`, source);
      return { ok: false, reason: "amount_mismatch" } as const;
    }
    const [res] = await pool.query<ResultSetHeader>(
      "UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP(3), xendit_payment_id = ? WHERE id = ? AND status IN ('pending_payment','expired')",
      [s.payment_id || null, order.id]
    );
    if (res.affectedRows === 1) {
      await addEvent(pool, order.id, "paid", `Pembayaran diterima (Xendit ${s.payment_id || sessionId})`, source);
      // Kurangi stok bila dibatasi.
      await pool.query(
        `UPDATE products p JOIN order_items oi ON oi.product_id = p.id
            SET p.stock = p.stock - oi.quantity WHERE oi.order_id = ? AND p.stock IS NOT NULL`,
        [order.id]
      );
    }
    return { ok: true, status: "paid" } as const;
  }
  if (s.status === "EXPIRED" || s.status === "CANCELED") {
    const [res] = await pool.query<ResultSetHeader>(
      "UPDATE orders SET status = 'expired' WHERE id = ? AND status = 'pending_payment'",
      [order.id]
    );
    if (res.affectedRows === 1) await addEvent(pool, order.id, "expired", `Sesi pembayaran ${s.status}`, source);
    return { ok: true, status: "expired" } as const;
  }
  return { ok: true, status: "pending_payment" } as const;
}

export { addEvent };
