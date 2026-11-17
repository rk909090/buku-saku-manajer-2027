import type { NextRequest } from "next/server";
import { z } from "zod";
import { isDbConfigured } from "@/lib/db";
import { ADMIN_COOKIE, clearLoginFailures, login, loginThrottled, recordLoginFailure } from "@/lib/shop/auth";
import { clientIp, errorResponse, json, sameOrigin } from "@/lib/shop/http";

const body = z.object({ email: z.string().trim().max(190), password: z.string().max(200) });

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (!isDbConfigured()) return json({ error: "Database belum dikonfigurasi" }, 503);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Email dan password wajib diisi" }, 400);
  const key = `${clientIp(request)}:${parsed.data.email.toLowerCase()}`;
  if (loginThrottled(key)) return json({ error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." }, 429);
  try {
    const r = await login(parsed.data.email, parsed.data.password);
    if (!r) {
      recordLoginFailure(key);
      return json({ error: "Email atau password salah" }, 401);
    }
    clearLoginFailures(key);
    const res = json({ admin: r.admin });
    res.headers.append(
      "Set-Cookie",
      `${ADMIN_COOKIE}=${r.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${r.expires.toUTCString()}`
    );
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
