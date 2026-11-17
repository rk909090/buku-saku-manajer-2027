import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { AB_EXPERIMENT } from "@/lib/ab-config";
import { computeAbStats } from "@/lib/ab-stats";

/**
 * Ringkasan hasil A/B test (JSON). Dilindungi token dari env AB_STATS_TOKEN.
 * Akses: header "Authorization: Bearer <token>" atau ?token=<token>.
 * Event pratinjau (forced = 1, dari ?hl=) dihitung terpisah dan TIDAK masuk hasil.
 * (Data yang sama juga tampil di dashboard admin > Analitik A/B.)
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return Response.json({ error: "database belum dikonfigurasi" }, { status: 503 });
  const experiment = request.nextUrl.searchParams.get("experiment") || AB_EXPERIMENT;
  try {
    return Response.json(await computeAbStats(experiment), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[A/B stats]", (err as Error).message);
    return Response.json({ error: "gagal membaca database" }, { status: 500 });
  }
}

function authorized(request: NextRequest) {
  const expected = process.env.AB_STATS_TOKEN;
  if (!expected || expected.length < 16) return false;
  const header = request.headers.get("authorization");
  const given = header?.startsWith("Bearer ") ? header.slice(7) : request.nextUrl.searchParams.get("token") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
