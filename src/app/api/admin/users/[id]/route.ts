import type { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { hashPassword, passwordOk, PASSWORD_RULE, revokeSessionsFor } from "@/lib/shop/auth";
import { json, withAdmin } from "@/lib/shop/http";
import { listAdmins } from "@/lib/shop/admins";

const body = z.object({
  active: z.boolean().optional(),
  role: z.enum(["owner", "admin"]).optional(),
  password: z.string().optional(),
});

/** Ubah admin lain (hanya owner): aktif/nonaktif, peran, reset password. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/users/[id]">) {
  return withAdmin(
    request,
    async (me) => {
      const id = Number((await ctx.params).id);
      const parsed = body.safeParse(await request.json().catch(() => null));
      if (!Number.isInteger(id) || id < 1 || !parsed.success) return json({ error: "Data tidak valid" }, 400);
      if (id === me.id && (parsed.data.active === false || parsed.data.role === "admin"))
        return json({ error: "Tidak bisa menonaktifkan / menurunkan peran akun sendiri" }, 400);
      const pool = getPool();
      const [t] = await pool.query<RowDataPacket[]>("SELECT id FROM admin_users WHERE id = ?", [id]);
      if (!t[0]) return json({ error: "not_found" }, 404);

      if (parsed.data.password !== undefined) {
        if (!passwordOk(parsed.data.password)) return json({ error: `Password: ${PASSWORD_RULE}` }, 400);
        await pool.query("UPDATE admin_users SET password_hash = ? WHERE id = ?", [await hashPassword(parsed.data.password), id]);
        await revokeSessionsFor(id);
      }
      if (parsed.data.role) await pool.query("UPDATE admin_users SET role = ? WHERE id = ?", [parsed.data.role, id]);
      if (parsed.data.active !== undefined) {
        await pool.query("UPDATE admin_users SET active = ? WHERE id = ?", [parsed.data.active ? 1 : 0, id]);
        if (!parsed.data.active) await revokeSessionsFor(id);
      }
      return json({ users: await listAdmins() });
    },
    { ownerOnly: true }
  );
}
