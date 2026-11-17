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

/**
 * A/B test headline hero.
 * Pengunjung "/" dibagi acak (bobot sama) ke salah satu varian, lalu di-rewrite
 * ke halaman statis /v/[varian]. URL di browser tetap "/".
 * Varian disimpan di cookie (format "<eksperimen>.<id>") agar konsisten antar-kunjungan.
 */
export function proxy(request: NextRequest) {
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
  matcher: ["/", "/v/:path*"],
};
