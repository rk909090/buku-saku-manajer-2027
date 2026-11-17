import type { NextRequest } from "next/server";
import { z } from "zod";
import { json, withAdmin } from "@/lib/shop/http";
import { getSettings, saveSettings } from "@/lib/shop/settings";
import { parseEmailList } from "@/lib/email/notify";

const body = z.object({
  notify_emails: z.string().max(2000),
  notify_on_pending: z.boolean(),
});
const emailSchema = z.email();

/** Simpan penerima notifikasi pesanan (bisa lebih dari satu email). */
export async function PUT(request: NextRequest) {
  return withAdmin(request, async () => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Data tidak valid" }, 400);
    const list = parseEmailList(parsed.data.notify_emails);
    const invalid = list.filter((e) => !emailSchema.safeParse(e).success || e.length > 190);
    if (invalid.length) return json({ error: `Email tidak valid: ${invalid.join(", ")}` }, 400);
    if (list.length > 20) return json({ error: "Maksimal 20 email penerima" }, 400);
    await saveSettings({ notify_emails: list.join(","), notify_on_pending: parsed.data.notify_on_pending ? 1 : 0 });
    return json({ settings: await getSettings() });
  });
}
