import type { NextRequest } from "next/server";
import { json, withAdmin } from "@/lib/shop/http";
import { listProducts } from "@/lib/shop/orders";

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => json({ products: await listProducts(false) }));
}
