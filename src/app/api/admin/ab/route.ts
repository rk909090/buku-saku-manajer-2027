import type { NextRequest } from "next/server";
import { AB_EXPERIMENT } from "@/lib/ab-config";
import { computeAbStats } from "@/lib/ab-stats";
import { headlineVariants } from "@/lib/content";
import { json, withAdmin } from "@/lib/shop/http";

/** Hasil A/B test headline untuk dashboard (sesi admin, bukan token). */
export async function GET(request: NextRequest) {
  return withAdmin(request, async () =>
    json({
      stats: await computeAbStats(AB_EXPERIMENT),
      variants: headlineVariants.map((v) => ({ id: v.id, name: v.name, kicker: v.kicker, headline: v.headline.join(" ") })),
    })
  );
}
