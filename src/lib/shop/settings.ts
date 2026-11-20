import "server-only";
import { ensureSchema, getPool } from "@/lib/db";

/**
 * Pengaturan toko (disimpan di tabel `settings`, diubah dari dashboard > Pengaturan).
 * Lokasi asal pengiriman TIDAK diberi nilai default: wajib diisi admin.
 */
export type ShopSettings = {
  origin_area_id: string;
  origin_area_name: string;
  origin_postal_code: string;
  /** Kode kurir Biteship dipisah koma, mis. "jne,jnt,sicepat". */
  couriers: string;
  max_qty_per_item: number;
  /**
   * Total pembayaran minimal (Rp). Default 10.000 = batas bawah BCA Virtual Account & Alfamart/Indomaret
   * menurut tabel metode pembayaran Xendit; QRIS/ShopeePay/GoPay mulai Rp1, DANA/OVO Rp100, kartu Rp5.000.
   */
  min_order_total: number;
  /** Email penerima notifikasi pesanan (admin), dipisah koma. */
  notify_emails: string;
  /** 1 = admin juga diberi tahu saat pesanan dibuat (belum dibayar). */
  notify_on_pending: number;
  /** Nomor WhatsApp toko (format internasional tanpa +, mis. 6287840848566). */
  whatsapp_number: string;
  /** Kanal pembayaran Xendit yang ditampilkan (kode dipisah koma). Kosong = semua metode yang aktif di akun. */
  payment_channels: string;
  /** Jam batas pengiriman "HH:MM" (WIB): pembayaran pada/di atas jam ini dikirim keesokan harinya. */
  ship_cutoff: string;
  /** Libur pengiriman: JSON [{start, end, label}] tanggal WIB "YYYY-MM-DD" (lihat shipping-schedule.ts). */
  ship_holidays: string;
};

/** Kurir umum untuk paket buku menurut dokumentasi Biteship; admin bisa mengubahnya. */
import { DEFAULT_WHATSAPP } from "@/lib/whatsapp";
import { DEFAULT_CUTOFF, toShipConfig, type ShipConfig } from "@/lib/shop/shipping-schedule";

export const DEFAULT_COURIERS = "jne,jnt,sicepat,anteraja,pos,idexpress,sap,tiki,ninja,lion";

const DEFAULTS: ShopSettings = {
  origin_area_id: "",
  origin_area_name: "",
  origin_postal_code: "",
  couriers: DEFAULT_COURIERS,
  max_qty_per_item: 20,
  min_order_total: 10000,
  notify_emails: "",
  notify_on_pending: 0,
  whatsapp_number: DEFAULT_WHATSAPP,
  payment_channels: "",
  ship_cutoff: DEFAULT_CUTOFF,
  ship_holidays: "[]",
};

/** Konfigurasi jadwal kirim dari pengaturan (nilai rusak → default). */
export const shipConfigOf = (s: Pick<ShopSettings, "ship_cutoff" | "ship_holidays">): ShipConfig => toShipConfig(s.ship_cutoff, s.ship_holidays);

export async function getSettings(): Promise<ShopSettings> {
  await ensureSchema();
  const [rows] = await getPool().query("SELECT `key`, value FROM settings");
  const out: ShopSettings = { ...DEFAULTS };
  for (const r of rows as { key: string; value: string | null }[]) {
    if (!(r.key in out) || r.value == null) continue;
    const k = r.key as keyof ShopSettings;
    (out as Record<string, unknown>)[k] = typeof DEFAULTS[k] === "number" ? Number(r.value) : r.value;
  }
  return out;
}

export async function saveSettings(patch: Partial<ShopSettings>) {
  await ensureSchema();
  const pool = getPool();
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in DEFAULTS) || v === undefined) continue;
    await pool.query(
      "INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
      [k, String(v)]
    );
  }
}
