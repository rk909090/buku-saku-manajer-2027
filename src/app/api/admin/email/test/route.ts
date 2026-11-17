import type { NextRequest } from "next/server";
import { clientIp, json, rateLimited, withAdmin } from "@/lib/shop/http";
import { getSettings } from "@/lib/shop/settings";
import { parseEmailList } from "@/lib/email/notify";
import { sendEmail } from "@/lib/email/send";
import { renderTestEmail } from "@/lib/email/templates";

/** Kirim email uji ke penerima notifikasi (atau ke email admin yang login bila daftar kosong). */
export async function POST(request: NextRequest) {
  return withAdmin(request, async (admin) => {
    if (rateLimited(`email-test:${clientIp(request)}`, 5, 10 * 60_000)) return json({ error: "Terlalu sering. Coba lagi beberapa menit lagi." }, 429);
    const list = parseEmailList((await getSettings()).notify_emails);
    const to = list.length ? list : [admin.email];
    const m = renderTestEmail();
    const r = await sendEmail({ to, subject: m.subject, html: m.html, text: m.text, tags: [{ name: "type", value: "test" }] });
    if (!r.ok) return json({ error: r.error }, r.skipped ? 503 : 502);
    return json({ ok: true, to, id: r.id });
  });
}
