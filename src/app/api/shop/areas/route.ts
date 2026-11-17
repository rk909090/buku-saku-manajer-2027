import { connection, type NextRequest } from "next/server";
import { searchAreas } from "@/lib/shop/biteship";
import { clientIp, errorResponse, json, rateLimited } from "@/lib/shop/http";

/** Autocomplete kecamatan/kota tujuan (proxy ke Biteship Maps, di-cache di server). */
export async function GET(request: NextRequest) {
  await connection();
  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 3) return json({ areas: [] });
  if (q.length > 80) return json({ error: "Kata kunci terlalu panjang" }, 400);
  if (rateLimited(`areas:${clientIp(request)}`, 60, 60_000)) return json({ error: "Terlalu banyak permintaan" }, 429);
  try {
    return json({ areas: await searchAreas(q) });
  } catch (e) {
    return errorResponse(e);
  }
}
