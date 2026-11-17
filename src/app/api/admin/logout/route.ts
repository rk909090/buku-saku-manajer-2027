import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, logout } from "@/lib/shop/auth";
import { errorResponse, json, sameOrigin } from "@/lib/shop/http";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    await logout(request);
  } catch (e) {
    return errorResponse(e);
  }
  const res = json({ ok: true });
  res.headers.append("Set-Cookie", `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return res;
}
