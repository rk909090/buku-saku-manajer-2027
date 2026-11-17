import "server-only";
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { ensureSchema, getPool } from "@/lib/db";
import { CouponError } from "@/lib/shop/errors";
import { formatRupiah } from "@/lib/format";
import { discountAmount } from "@/lib/shop/pricing";
export { applyMinimumTotal, discountAmount } from "@/lib/shop/pricing";

/**
 * Diskon & kupon.
 *  - Diskon: potongan otomatis per produk (atau semua produk) dalam periode tertentu. Bila ada beberapa
 *    diskon yang berlaku untuk satu produk, dipakai yang potongannya PALING BESAR (tidak ditumpuk).
 *  - Kupon: kode yang diketik pembeli; satu kupon per pesanan. Kuota total menghitung pesanan yang belum
 *    kedaluwarsa/dibatalkan (pesanan menunggu bayar ikut "memesan" kuota sampai kedaluwarsa 24 jam).
 *    Kuota per pelanggan (per email) hanya menghitung pesanan yang sudah dibayar.
 * Semua perhitungan dilakukan di server; angka dari browser tidak pernah dipakai.
 */

type Db = Pool | PoolConnection;

export type DiscountType = "percent" | "fixed";
export type CouponType = "percent" | "fixed" | "free_shipping";

export type Discount = {
  id: number;
  name: string;
  product_id: number | null;
  type: DiscountType;
  value: number;
  starts_at: Date | null;
  ends_at: Date | null;
  active: number;
};

export type Coupon = {
  id: number;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  max_discount: number | null;
  /** Kupon persen/nominal yang sekaligus menggratiskan ongkir (penuh). */
  free_shipping: number;
  min_subtotal: number | null;
  starts_at: Date | null;
  ends_at: Date | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  active: number;
};

const RESERVING = "('expired','cancelled')"; // status yang TIDAK memakai kuota
const PAID = "('paid','processing','shipped','completed')";

export const COUPON_CODE_RE = /^[A-Z0-9_-]{3,32}$/;
export const normalizeCode = (raw: string) => raw.trim().toUpperCase();

/* ───────────── Diskon produk ───────────── */

export async function activeDiscounts(db: Db = getPool(), now = new Date()): Promise<Discount[]> {
  await ensureSchema();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id, name, product_id, type, value, starts_at, ends_at, active FROM discounts
      WHERE active = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at > ?) ORDER BY id`,
    [now, now]
  );
  return rows as Discount[];
}

/** Diskon terbaik untuk satu produk. */
export function bestDiscount(price: number, productId: number, discounts: Discount[]) {
  let best: { amount: number; discount: Discount } | null = null;
  for (const d of discounts) {
    if (d.product_id != null && d.product_id !== productId) continue;
    const amount = discountAmount(price, d);
    if (amount > 0 && (!best || amount > best.amount)) best = { amount, discount: d };
  }
  return best;
}

/* ───────────── Kupon ───────────── */

export function couponLabel(c: Pick<Coupon, "type" | "value" | "max_discount" | "free_shipping">) {
  const ship = c.free_shipping ? " + gratis ongkir" : "";
  if (c.type === "percent") return `Diskon ${c.value}%${c.max_discount ? ` (maks. ${formatRupiah(c.max_discount)})` : ""}${ship}`;
  if (c.type === "fixed") return `Potongan ${formatRupiah(c.value)}${ship}`;
  return c.max_discount ? `Gratis ongkir s.d. ${formatRupiah(c.max_discount)}` : "Gratis ongkir";
}

export type CouponQuote = {
  coupon: Coupon;
  label: string;
  /** Potongan dari subtotal produk. */
  discount: number;
  /** Potongan ongkir; null bila kurir belum dipilih. */
  shippingDiscount: number | null;
};

const fail = (msg: string) => new CouponError(msg);

/**
 * Validasi & hitung kupon. `lock` = kunci baris kupon (SELECT … FOR UPDATE) di dalam transaksi
 * pembuatan pesanan agar kuota tidak terlampaui oleh pesanan yang bersamaan.
 */
export async function evaluateCoupon(
  db: Db,
  rawCode: string,
  ctx: { subtotal: number; shippingCost: number | null; email: string | null; lock?: boolean; now?: Date }
): Promise<CouponQuote> {
  await ensureSchema();
  const code = normalizeCode(rawCode);
  if (!COUPON_CODE_RE.test(code)) throw fail("Kode kupon tidak valid");
  const now = ctx.now || new Date();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT * FROM coupons WHERE code = ? LIMIT 1${ctx.lock ? " FOR UPDATE" : ""}`,
    [code]
  );
  const c = rows[0] as Coupon | undefined;
  if (!c || !c.active) throw fail("Kode kupon tidak valid");
  if (c.starts_at && c.starts_at > now) throw fail("Kupon ini belum berlaku");
  if (c.ends_at && c.ends_at <= now) throw fail("Kupon ini sudah berakhir");

  if (c.usage_limit != null) {
    const [u] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS n FROM orders WHERE coupon_id = ? AND status NOT IN ${RESERVING}`,
      [c.id]
    );
    if (Number(u[0].n) >= c.usage_limit) throw fail("Kuota kupon ini sudah habis");
  }
  if (c.per_customer_limit != null && ctx.email) {
    const [u] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS n FROM orders o JOIN customers cu ON cu.id = o.customer_id
        WHERE o.coupon_id = ? AND cu.email = ? AND o.status IN ${PAID}`,
      [c.id, ctx.email.trim().toLowerCase()]
    );
    if (Number(u[0].n) >= c.per_customer_limit) throw fail("Kupon ini sudah mencapai batas pemakaian untuk email Anda");
  }
  if (c.min_subtotal && ctx.subtotal < c.min_subtotal) {
    throw fail(`Kupon berlaku untuk belanja minimal ${formatRupiah(c.min_subtotal)}`);
  }

  let discount = 0;
  let shippingDiscount: number | null = 0;
  if (c.type === "percent") {
    discount = Math.floor((ctx.subtotal * Math.min(c.value, 100)) / 100);
    if (c.max_discount) discount = Math.min(discount, c.max_discount);
  } else if (c.type === "fixed") {
    discount = Math.min(c.value, ctx.subtotal);
  }
  if (c.type !== "free_shipping" && c.free_shipping) {
    shippingDiscount = ctx.shippingCost; // gratis ongkir penuh (null bila kurir belum dipilih)
  } else if (c.type === "free_shipping") {
    shippingDiscount = ctx.shippingCost == null ? null : Math.min(ctx.shippingCost, c.max_discount ?? ctx.shippingCost);
  }
  return { coupon: c, label: couponLabel(c), discount, shippingDiscount };
}

/** Ada minimal satu kupon yang sedang berlaku (untuk menampilkan kolom kupon di checkout). */
export async function hasRedeemableCoupon(now = new Date()) {
  await ensureSchema();
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT 1 FROM coupons WHERE active = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at > ?) LIMIT 1`,
    [now, now]
  );
  return rows.length > 0;
}

/* ───────────── Untuk dashboard ───────────── */

export type PromoState = "active" | "scheduled" | "ended" | "inactive" | "exhausted";

export function promoState(p: { active: number; starts_at: Date | null; ends_at: Date | null }, now: Date, exhausted = false): PromoState {
  if (!p.active) return "inactive";
  if (p.ends_at && p.ends_at <= now) return "ended";
  if (p.starts_at && p.starts_at > now) return "scheduled";
  if (exhausted) return "exhausted";
  return "active";
}

export async function listPromos() {
  await ensureSchema();
  const pool = getPool();
  const now = new Date();
  const [d] = await pool.query<RowDataPacket[]>(
    `SELECT d.*, p.name AS product_name FROM discounts d LEFT JOIN products p ON p.id = d.product_id ORDER BY d.id DESC`
  );
  const [c] = await pool.query<RowDataPacket[]>(
    `SELECT c.*,
            (SELECT COUNT(*) FROM orders o WHERE o.coupon_id = c.id AND o.status NOT IN ${RESERVING}) AS used,
            (SELECT COUNT(*) FROM orders o WHERE o.coupon_id = c.id AND o.status IN ${PAID}) AS paid_uses,
            (SELECT COALESCE(SUM(o.coupon_discount + o.shipping_discount), 0) FROM orders o WHERE o.coupon_id = c.id AND o.status IN ${PAID}) AS total_discount
       FROM coupons c ORDER BY c.id DESC`
  );
  return {
    now,
    discounts: d.map((r) => ({ ...r, state: promoState(r as Discount, now) })),
    coupons: c.map((r) => {
      const used = Number(r.used);
      return {
        ...r,
        used,
        paid_uses: Number(r.paid_uses),
        total_discount: Number(r.total_discount),
        state: promoState(r as Coupon, now, r.usage_limit != null && used >= r.usage_limit),
      };
    }),
  };
}
