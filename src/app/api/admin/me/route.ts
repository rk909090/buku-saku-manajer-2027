import type { NextRequest } from "next/server";
import { integrationStatus } from "@/lib/shop/env";
import { json, withAdmin } from "@/lib/shop/http";

export async function GET(request: NextRequest) {
  return withAdmin(request, async (admin) => json({ admin, integrations: integrationStatus() }));
}
