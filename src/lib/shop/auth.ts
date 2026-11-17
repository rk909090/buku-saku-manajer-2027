import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { ensureSchema, getPool } from "@/lib/db";
import { env } from "@/lib/shop/env";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const ADMIN_COOKIE = "bsm_admin";
const SESSION_DAYS = 7;

export type Admin = { id: number; email: string; name: string; role: "owner" | "admin" };

/* ── Password: scrypt$<saltHex>$<hashHex> ── */
export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [alg, saltHex, hashHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(pw, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const PASSWORD_RULE = "Minimal 10 karakter";
export function passwordOk(pw: string) {
  return typeof pw === "string" && pw.length >= 10 && pw.length <= 200;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Admin pertama dibuat dari env ADMIN_BOOTSTRAP_* hanya jika tabel admin masih kosong. */
async function bootstrapIfEmpty() {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM admin_users");
  if (Number(rows[0].n) > 0) return;
  const email = env.bootstrapEmail();
  const pw = env.bootstrapPassword();
  if (!email || !passwordOk(pw)) return;
  await pool.query("INSERT IGNORE INTO admin_users (email, name, password_hash, role) VALUES (?, ?, ?, 'owner')", [
    email,
    email.split("@")[0],
    await hashPassword(pw),
  ]);
}

/* ── Rate limit login sederhana di memori: 8 percobaan / 15 menit per IP+email ── */
const attempts = new Map<string, { n: number; at: number }>();
export function loginThrottled(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.at > 15 * 60 * 1000) return false;
  return a.n >= 8;
}
export function recordLoginFailure(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.at > 15 * 60 * 1000) attempts.set(key, { n: 1, at: now });
  else a.n++;
}
export function clearLoginFailures(key: string) {
  attempts.delete(key);
}

export async function login(email: string, password: string) {
  await ensureSchema();
  await bootstrapIfEmpty();
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, email, name, role, password_hash, active FROM admin_users WHERE email = ? LIMIT 1",
    [email.trim().toLowerCase()]
  );
  const u = rows[0];
  // Tetap jalankan scrypt walau user tidak ada, agar waktu respons tidak membocorkan email terdaftar.
  const ok = await verifyPassword(password, u?.password_hash || "scrypt$00$00");
  if (!u || !ok || !u.active) return null;

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
  const pool = getPool();
  await pool.query("INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)", [sha256(token), u.id, expires]);
  await pool.query("UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [u.id]);
  await pool.query("DELETE FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP(3)");
  return { token, expires, admin: { id: u.id, email: u.email, name: u.name, role: u.role } as Admin };
}

export async function getAdmin(request: NextRequest): Promise<Admin | null> {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  await ensureSchema();
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT u.id, u.email, u.name, u.role FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_id
      WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP(3) AND u.active = 1 LIMIT 1`,
    [sha256(token)]
  );
  return (rows[0] as Admin) || null;
}

export async function logout(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (token) await getPool().query("DELETE FROM admin_sessions WHERE token_hash = ?", [sha256(token)]);
}

export async function revokeSessionsFor(adminId: number) {
  await getPool().query("DELETE FROM admin_sessions WHERE admin_id = ?", [adminId]);
}
