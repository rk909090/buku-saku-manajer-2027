import "server-only";
import { unstable_rethrow } from "next/navigation";
import { connection, type NextRequest } from "next/server";
import { getAdmin, type Admin } from "@/lib/shop/auth";
import { isDbConfigured } from "@/lib/db";
import { CouponError, ShopError } from "@/lib/shop/errors";
import { BiteshipError } from "@/lib/shop/biteship";
import { XenditError } from "@/lib/shop/xendit";

const SITE_HOST = "bsm.humplus.com";

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** Request yang mengubah data harus berasal dari situs ini (cek Origin vs host). */
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return request.method === "GET";
  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  const hosts = [SITE_HOST, request.headers.get("x-forwarded-host"), request.headers.get("host")]
    .flatMap((h) => (h ? h.split(",") : []))
    .map((h) => h.trim().toLowerCase());
  return hosts.includes(host);
}

export function clientIp(request: NextRequest) {
  return (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

/* Rate limit sederhana per kunci (memori proses). */
const buckets = new Map<string, { n: number; at: number }>();
export function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.at > windowMs) {
    buckets.set(key, { n: 1, at: now });
    if (buckets.size > 5000) buckets.delete(buckets.keys().next().value as string);
    return false;
  }
  b.n++;
  return b.n > max;
}

export function errorResponse(e: unknown) {
  // Sinyal internal Next.js (mis. bail-out prerender) harus diteruskan, bukan dijadikan 500.
  unstable_rethrow(e);
  if (e instanceof CouponError) return json({ error: e.message, field: "coupon" }, e.status);
  if (e instanceof ShopError) return json({ error: e.message }, e.status);
  if (e instanceof BiteshipError) {
    console.error("[biteship]", e.status, e.code, e.message);
    if (e.status === 503) return json({ error: "Perhitungan ongkir belum dikonfigurasi" }, 503);
    if (e.code === 40001010) return json({ error: "Tidak ada kurir yang melayani alamat ini" }, 422);
    if (e.code === 40001001) return json({ error: "Kode pos/area tidak valid" }, 422);
    return json({ error: "Gagal menghitung ongkir. Coba lagi sebentar." }, 502);
  }
  if (e instanceof XenditError) {
    console.error("[xendit]", e.status, e.code, e.message);
    return json({ error: "Layanan pembayaran sedang bermasalah. Coba lagi sebentar." }, 502);
  }
  console.error("[shop]", e);
  return json({ error: "Terjadi kesalahan server" }, 500);
}

/** Bungkus handler admin: wajib login, cek DB & origin untuk method selain GET. */
export async function withAdmin(
  request: NextRequest,
  fn: (admin: Admin) => Promise<Response>,
  opts: { ownerOnly?: boolean } = {}
) {
  await connection(); // selalu dirender saat request (sesi admin), tidak pernah di-prerender
  try {
    if (!isDbConfigured()) return json({ error: "Database belum dikonfigurasi" }, 503);
    if (request.method !== "GET" && !sameOrigin(request)) return json({ error: "forbidden" }, 403);
    const admin = await getAdmin(request);
    if (!admin) return json({ error: "unauthorized" }, 401);
    if (opts.ownerOnly && admin.role !== "owner") return json({ error: "Hanya owner yang boleh melakukan ini" }, 403);
    return await fn(admin);
  } catch (e) {
    return errorResponse(e);
  }
}
