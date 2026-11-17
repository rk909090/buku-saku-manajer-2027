import type { NextRequest } from "next/server";
import { z } from "zod";
import { json, withAdmin } from "@/lib/shop/http";
import { getSettings, saveSettings, DEFAULT_COURIERS } from "@/lib/shop/settings";
import { integrationStatus } from "@/lib/shop/env";

const body = z.object({
  origin_area_id: z.string().trim().min(3).max(64),
  origin_area_name: z.string().trim().min(3).max(255),
  origin_postal_code: z.string().trim().max(10),
  couriers: z.string().trim().regex(/^[a-z_]+(,[a-z_]+)*$/, "Format kurir: kode dipisah koma tanpa spasi"),
  max_qty_per_item: z.number().int().min(1).max(100),
});

export async function GET(request: NextRequest) {
  return withAdmin(request, async () =>
    json({ settings: await getSettings(), defaultCouriers: DEFAULT_COURIERS, integrations: integrationStatus() })
  );
}

export async function PUT(request: NextRequest) {
  return withAdmin(request, async () => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || "Data tidak valid" }, 400);
    await saveSettings(parsed.data);
    return json({ settings: await getSettings() });
  });
}
