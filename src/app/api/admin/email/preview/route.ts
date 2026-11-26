import type { NextRequest } from "next/server";
import { withAdmin } from "@/lib/shop/http";
import { getSettings, shipConfigOf } from "@/lib/shop/settings";
import { orderGreeting, waLink } from "@/lib/whatsapp";
import { renderAdminNewOrder, renderCustomerEmail, renderTestEmail, sampleOrder, shipInfo, type CustomerEmailKind } from "@/lib/email/templates";

const KINDS: CustomerEmailKind[] = ["created", "paid", "processing", "shipped", "tracking", "completed", "cancelled", "expired"];

/** Pratinjau desain email dengan data contoh (bukan data pelanggan). ?kind=created|…|admin|test */
export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const kind = request.nextUrl.searchParams.get("kind") || "created";
    const settings = await getSettings();
    const sample = sampleOrder();
    // Data contoh, tetapi jam batas & libur memakai pengaturan toko (contoh dibayar "sekarang").
    const o = {
      ...sample,
      whatsappUrl: waLink(settings.whatsapp_number, orderGreeting(settings.whatsapp_greeting, sample.orderNumber)),
      ship: shipInfo(sample.paidAt, shipConfigOf(settings)),
    };
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
