import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { hashPassword, passwordOk, PASSWORD_RULE, verifyPassword } from "@/lib/shop/auth";
import { json, withAdmin } from "@/lib/shop/http";

const body = z.object({ current: z.string().max(200), next: z.string().max(200) });

/** Ganti password akun sendiri. */
export async function PATCH(request: NextRequest) {
  return withAdmin(request, async (me) => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Data tidak valid" }, 400);
    if (!passwordOk(parsed.data.next)) return json({ error: `Password baru: ${PASSWORD_RULE}` }, 400);
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>("SELECT password_hash FROM admin_users WHERE id = ?", [me.id]);
    if (!rows[0] || !(await verifyPassword(parsed.data.current, rows[0].password_hash)))
      return json({ error: "Password saat ini salah" }, 400);
    await pool.query("UPDATE admin_users SET password_hash = ? WHERE id = ?", [await hashPassword(parsed.data.next), me.id]);
    return json({ ok: true });
  });
}
