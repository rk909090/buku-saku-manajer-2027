import type { NextRequest } from "next/server";
import { withAdmin } from "@/lib/shop/http";
import { getSettings } from "@/lib/shop/settings";
import { waLink } from "@/lib/whatsapp";
import { renderAdminNewOrder, renderCustomerEmail, renderTestEmail, sampleOrder, type CustomerEmailKind } from "@/lib/email/templates";

const KINDS: CustomerEmailKind[] = ["created", "paid", "processing", "shipped", "tracking", "completed", "cancelled", "expired"];

/** Pratinjau desain email dengan data contoh (bukan data pelanggan). ?kind=created|…|admin|test */
export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const kind = request.nextUrl.searchParams.get("kind") || "created";
    const o = { ...sampleOrder(), whatsappUrl: waLink((await getSettings()).whatsapp_number) };
    const m =
      kind === "admin"
        ? renderAdminNewOrder(o, true)
        : kind === "test"
          ? renderTestEmail()
          : renderCustomerEmail(KINDS.includes(kind as CustomerEmailKind) ? (kind as CustomerEmailKind) : "created", o);
    return new Response(m.html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  });
}
