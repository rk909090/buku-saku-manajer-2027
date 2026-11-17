import "server-only";
import mysql, { type Pool } from "mysql2/promise";

/**
 * Koneksi MySQL untuk pencatatan A/B test.
 * Kredensial HANYA dari environment variable (diset di hPanel / API Hostinger),
 * tidak pernah ditulis di kode. Di Hostinger gunakan DB_HOST=127.0.0.1.
 */
const REQUIRED = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;

export function isDbConfigured(): boolean {
  return REQUIRED.every((k) => !!process.env[k]);
}

const globalForDb = globalThis as unknown as { __bsmPool?: Pool; __bsmSchema?: Promise<void> };

export function getPool(): Pool {
  if (!isDbConfigured()) throw new Error("Database belum dikonfigurasi (DB_HOST/DB_NAME/DB_USER/DB_PASSWORD).");
  if (!globalForDb.__bsmPool) {
    globalForDb.__bsmPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionLimit: 5,
      waitForConnections: true,
      enableKeepAlive: true,
      timezone: "Z",
    });
  }
  return globalForDb.__bsmPool;
}

/** Membuat tabel bila belum ada + migrasi kolom baru. Dijalankan sekali per proses. */
export function ensureSchema(): Promise<void> {
  if (!globalForDb.__bsmSchema) {
    globalForDb.__bsmSchema = migrate().catch((err) => {
      globalForDb.__bsmSchema = undefined; // coba lagi di request berikutnya
      throw err;
    });
  }
  return globalForDb.__bsmSchema;
}

async function migrate(): Promise<void> {
  const pool = getPool();
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ab_events (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      experiment  VARCHAR(64)     NOT NULL,
      variant     VARCHAR(8)      NOT NULL,
      event       VARCHAR(32)     NOT NULL,
      placement   VARCHAR(32)     NULL,
      marketplace VARCHAR(16)     NULL,
      visitor_id  CHAR(36)        NULL,
      forced      TINYINT(1)      NOT NULL DEFAULT 0,
      device      VARCHAR(16)     NULL,
      PRIMARY KEY (id),
      KEY idx_exp_var_evt (experiment, variant, event),
      KEY idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  // Migrasi 17 Nov 2026: kolom `marketplace` (shopee/tokopedia) untuk tabel yang dibuat sebelumnya.
  // Klik yang tercatat sebelum kolom ini ada semuanya ke Shopee (satu-satunya CTA saat itu).
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ab_events' AND COLUMN_NAME = 'marketplace'`
  );
  if ((cols as unknown[]).length === 0) {
    await pool.query(`ALTER TABLE ab_events ADD COLUMN marketplace VARCHAR(16) NULL AFTER placement`);
    await pool.query(`UPDATE ab_events SET marketplace = 'shopee' WHERE event = 'ab_cta_click' AND marketplace IS NULL`);
  }

  for (const sql of SHOP_SCHEMA) await pool.query(sql);
  await seedShop();
}

/* ─────────────── Toko: produk, pesanan, pelanggan, admin ─────────────── */

const T = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

const SHOP_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS products (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug        VARCHAR(64)  NOT NULL,
    name        VARCHAR(160) NOT NULL,
    price       INT UNSIGNED NOT NULL,
    weight_g    INT UNSIGNED NULL,
    length_cm   DECIMAL(6,1) NULL,
    width_cm    DECIMAL(6,1) NULL,
    height_cm   DECIMAL(6,1) NULL,
    stock       INT NULL COMMENT 'NULL = tidak dibatasi',
    image_url   VARCHAR(255) NULL,
    active      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id), UNIQUE KEY uq_slug (slug)
  ) ${T}`,
  `CREATE TABLE IF NOT EXISTS settings (
    \`key\`     VARCHAR(64) NOT NULL,
    value       TEXT        NULL,
    updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`key\`)
  ) ${T}`,
  `CREATE TABLE IF NOT EXISTS customers (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(190) NOT NULL,
    phone       VARCHAR(32)  NOT NULL,
    created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id), UNIQUE KEY uq_email (email)
  ) ${T}`,
  `CREATE TABLE IF NOT EXISTS orders (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_number          VARCHAR(32)  NOT NULL,
    public_token          CHAR(32)     NOT NULL,
    customer_id           BIGINT UNSIGNED NOT NULL,
    status                VARCHAR(24)  NOT NULL DEFAULT 'pending_payment',
    subtotal              INT UNSIGNED NOT NULL,
    shipping_cost         INT UNSIGNED NOT NULL,
    total                 INT UNSIGNED NOT NULL,
    courier_code          VARCHAR(32)  NOT NULL,
    courier_service_code  VARCHAR(48)  NOT NULL,
    courier_name          VARCHAR(80)  NOT NULL,
    courier_service_name  VARCHAR(120) NOT NULL,
    shipping_etd          VARCHAR(48)  NULL,
    recipient_name        VARCHAR(120) NOT NULL,
    recipient_phone       VARCHAR(32)  NOT NULL,
    address               VARCHAR(500) NOT NULL,
    area_id               VARCHAR(64)  NOT NULL,
    area_name             VARCHAR(255) NOT NULL,
    postal_code           VARCHAR(10)  NULL,
    notes                 VARCHAR(500) NULL,
    xendit_session_id     VARCHAR(64)  NULL,
    payment_link_url      VARCHAR(255) NULL,
    xendit_payment_id     VARCHAR(64)  NULL,
    payment_expires_at    DATETIME(3)  NULL,
    paid_at               DATETIME(3)  NULL,
    tracking_number       VARCHAR(64)  NULL,
    shipped_at            DATETIME(3)  NULL,
    ab_variant            VARCHAR(8)   NULL,
    visitor_id            CHAR(36)     NULL,
    created_at            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_order_number (order_number),
    KEY idx_customer (customer_id),
    KEY idx_status (status),
    KEY idx_created (created_at),
    KEY idx_session (xendit_session_id)
  ) ${T}`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id    BIGINT UNSIGNED NOT NULL,
    product_id  INT UNSIGNED    NOT NULL,
    name        VARCHAR(160)    NOT NULL,
    unit_price  INT UNSIGNED    NOT NULL,
    quantity    INT UNSIGNED    NOT NULL,
    weight_g    INT UNSIGNED    NOT NULL,
    PRIMARY KEY (id), KEY idx_order (order_id)
  ) ${T}`,
  `CREATE TABLE IF NOT EXISTS order_events (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id    BIGINT UNSIGNED NOT NULL,
    type        VARCHAR(32)     NOT NULL,
    message     VARCHAR(500)    NOT NULL,
    actor       VARCHAR(190)    NULL,
    created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id), KEY idx_order (order_id)
  ) ${T}`,
  `CREATE TABLE IF NOT EXISTS webhook_events (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    provider     VARCHAR(16)  NOT NULL,
    dedupe_key   VARCHAR(190) NOT NULL,
    event        VARCHAR(64)  NULL,
    payload      MEDIUMTEXT   NULL,
    received_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id), UNIQUE KEY uq_dedupe (provider, dedupe_key)
  ) ${T}`,
  `CREATE TABLE IF NOT EXISTS admin_users (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email          VARCHAR(190) NOT NULL,
    name           VARCHAR(120) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(16)  NOT NULL DEFAULT 'admin',
    active         TINYINT(1)   NOT NULL DEFAULT 1,
    last_login_at  DATETIME(3)  NULL,
    created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id), UNIQUE KEY uq_email (email)
  ) ${T}`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash  CHAR(64)     NOT NULL,
    admin_id    INT UNSIGNED NOT NULL,
    expires_at  DATETIME(3)  NOT NULL,
    created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (token_hash), KEY idx_admin (admin_id), KEY idx_expires (expires_at)
  ) ${T}`,
];

/**
 * Data awal: produk Buku Saku Manajer (harga Rp120.000 dari pemilik). Berat & dimensi
 * sengaja NULL — harus diisi admin di dashboard; tanpa itu ongkir tidak dihitung.
 */
async function seedShop() {
  const pool = getPool();
  await pool.query(
    `INSERT IGNORE INTO products (slug, name, price, image_url) VALUES (?, ?, ?, ?)`,
    ["buku-saku-manajer", "Buku Saku Manajer — Edisi Kedua", 120000, "/images/bsm-cover.png"]
  );
}
