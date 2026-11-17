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

/** Membuat tabel bila belum ada. Dijalankan sekali per proses. */
export function ensureSchema(): Promise<void> {
  if (!globalForDb.__bsmSchema) {
    globalForDb.__bsmSchema = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS ab_events (
          id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          experiment  VARCHAR(64)     NOT NULL,
          variant     VARCHAR(8)      NOT NULL,
          event       VARCHAR(32)     NOT NULL,
          placement   VARCHAR(32)     NULL,
          visitor_id  CHAR(36)        NULL,
          forced      TINYINT(1)      NOT NULL DEFAULT 0,
          device      VARCHAR(16)     NULL,
          PRIMARY KEY (id),
          KEY idx_exp_var_evt (experiment, variant, event),
          KEY idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
      )
      .then(() => undefined)
      .catch((err) => {
        globalForDb.__bsmSchema = undefined; // coba lagi di request berikutnya
        throw err;
      });
  }
  return globalForDb.__bsmSchema;
}
