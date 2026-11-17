import { NextResponse, type NextRequest } from "next/server";
import {
  AB_COOKIE,
  AB_COOKIE_MAX_AGE,
  AB_EXPERIMENT,
  AB_QUERY_PARAM,
  AB_VARIANTS,
  AB_VISITOR_COOKIE,
  AB_VISITOR_MAX_AGE,
  isAbVariant,
  type AbVariantId,
} from "@/lib/ab-config";

/** Nama cookie sesi admin (sama dengan ADMIN_COOKIE di src/lib/shop/auth.ts). */
const ADMIN_COOKIE = "bsm_admin";

/**
 * A/B test headline hero.
 * Pengunjung "/" dibagi acak (bobot sama) ke salah satu varian, lalu di-rewrite
 * ke halaman statis /v/[varian]. URL di browser tetap "/".
 * Varian disimpan di cookie (format "<eksperimen>.<id>") agar konsisten antar-kunjungan.
 */
export function proxy(request: NextRequest) {
  // Dashboard admin: tanpa cookie sesi langsung ke halaman login. Validasi sesi yang
  // sebenarnya tetap di server (setiap /api/admin/* memeriksa sesi di database).
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const isLogin = request.nextUrl.pathname === "/admin/login";
    if (!isLogin && !request.cookies.get(ADMIN_COOKIE)?.value) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // /v/* hanya target rewrite internal. Akses langsung diarahkan ke "/"
  // (varian valid dipertahankan sebagai ?hl= untuk pratinjau).
  if (request.nextUrl.pathname.startsWith("/v/")) {
    const id = request.nextUrl.pathname.split("/")[2];
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = isAbVariant(id) ? `?${AB_QUERY_PARAM}=${id}` : "";
    return NextResponse.redirect(url, 308);
  }

  const secure = request.nextUrl.protocol === "https:";

  // Bot / crawler (mesin pencari, AI, pratinjau link) selalu mendapat varian kontrol tanpa
  // cookie: judul yang diindeks stabil dan bot tidak ikut sebagai peserta A/B test.
  if (BOT_RE.test(request.headers.get("user-agent") ?? "")) {
    return rewriteTo(request, AB_VARIANTS[0]);
  }

  // QA: /?hl=b memaksa varian tanpa menyentuh cookie varian.
  const forced = request.nextUrl.searchParams.get(AB_QUERY_PARAM);
  if (isAbVariant(forced)) {
    return withVisitorId(request, rewriteTo(request, forced), secure);
  }

  const [experiment, saved] = (request.cookies.get(AB_COOKIE)?.value ?? "").split(".");
  if (experiment === AB_EXPERIMENT && isAbVariant(saved)) {
    return withVisitorId(request, rewriteTo(request, saved), secure);
  }

  const assigned = pickRandomVariant();
  const response = rewriteTo(request, assigned);
  response.cookies.set(AB_COOKIE, `${AB_EXPERIMENT}.${assigned}`, {
    maxAge: AB_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure,
  });
  return withVisitorId(request, response, secure);
}

/** Memberi ID pengunjung anonim (UUID acak) bila belum ada. */
function withVisitorId(request: NextRequest, response: NextResponse, secure: boolean) {
  if (!UUID_RE.test(request.cookies.get(AB_VISITOR_COOKIE)?.value ?? "")) {
    response.cookies.set(AB_VISITOR_COOKIE, crypto.randomUUID(), {
      maxAge: AB_VISITOR_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure,
      httpOnly: true,
    });
  }
  return response;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_RE =
  /bot\b|bot\/|crawl|spider|slurp|googleother|google-extended|chatgpt-user|facebookexternalhit|whatsapp|telegram|lighthouse|headlesschrome|curl\/|wget|python-requests/i;

function rewriteTo(request: NextRequest, variant: AbVariantId) {
  const url = request.nextUrl.clone();
  url.pathname = `/v/${variant}`;
  return NextResponse.rewrite(url);
}

function pickRandomVariant(): AbVariantId {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return AB_VARIANTS[buf[0] % AB_VARIANTS.length];
}

export const config = {
  matcher: ["/", "/v/:path*", "/admin/:path*", "/admin"],
};
