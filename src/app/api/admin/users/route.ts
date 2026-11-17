import type { NextRequest } from "next/server";
import { z } from "zod";
import { getPool } from "@/lib/db";
import { hashPassword, passwordOk, PASSWORD_RULE } from "@/lib/shop/auth";
import { json, withAdmin } from "@/lib/shop/http";
import { listAdmins } from "@/lib/shop/admins";

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => json({ users: await listAdmins() }));
}

const body = z.object({
  email: z.string().trim().toLowerCase().max(190).pipe(z.email("Email tidak valid")),
  name: z.string().trim().min(2).max(120),
  role: z.enum(["owner", "admin"]),
  password: z.string(),
});

/** Tambah admin (hanya owner). */
export async function POST(request: NextRequest) {
  return withAdmin(
    request,
    async () => {
      const parsed = body.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || "Data tidak valid" }, 400);
      if (!passwordOk(parsed.data.password)) return json({ error: `Password: ${PASSWORD_RULE}` }, 400);
      try {
        await getPool().query("INSERT INTO admin_users (email, name, password_hash, role) VALUES (?, ?, ?, ?)", [
          parsed.data.email,
          parsed.data.name,
          await hashPassword(parsed.data.password),
          parsed.data.role,
        ]);
      } catch (e) {
        if ((e as { code?: string }).code === "ER_DUP_ENTRY") return json({ error: "Email sudah terdaftar" }, 409);
        throw e;
      }
      return json({ users: await listAdmins() }, 201);
    },
    { ownerOnly: true }
  );
}
