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
};

/** Kurir umum untuk paket buku menurut dokumentasi Biteship; admin bisa mengubahnya. */
export const DEFAULT_COURIERS = "jne,jnt,sicepat,anteraja,pos,idexpress,sap,tiki,ninja,lion";

const DEFAULTS: ShopSettings = {
  origin_area_id: "",
  origin_area_name: "",
  origin_postal_code: "",
  couriers: DEFAULT_COURIERS,
  max_qty_per_item: 20,
};

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
