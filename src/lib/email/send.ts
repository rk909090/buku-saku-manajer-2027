import "server-only";
import { env } from "@/lib/shop/env";

/**
 * Kirim email lewat Resend REST API (https://resend.com/docs/api-reference/emails/send-email).
 *  - POST https://api.resend.com/emails, header `Authorization: Bearer re_…` dan `User-Agent` (wajib menurut dok).
 *  - `Idempotency-Key` (≤256 karakter, disimpan Resend 24 jam) mencegah email ganda bila terkirim ulang.
 *  - Alamat `from` harus memakai domain yang sudah diverifikasi di Resend (humplus.com).
 * Tidak pernah melempar error: mengembalikan { ok:false, error } agar alur pesanan tidak terganggu.
 */
export type SendResult = { ok: true; id: string } | { ok: false; error: string; skipped?: boolean };

export async function sendEmail(m: {
  to: string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  tags?: { name: string; value: string }[];
}): Promise<SendResult> {
  const key = env.resendKey();
  if (!key) return { ok: false, skipped: true, error: "RESEND_API_KEY belum diisi" };
  if (m.to.length === 0) return { ok: false, skipped: true, error: "tidak ada penerima" };

  const body = JSON.stringify({
    from: env.emailFrom(),
    to: m.to.slice(0, 50), // batas Resend: maks. 50 alamat per email
    subject: m.subject,
    html: m.html,
    text: m.text,
    ...(m.tags?.length ? { tags: m.tags } : {}),
  });

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "User-Agent": "bsm-humplus/1.0",
          ...(m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey.slice(0, 256) } : {}),
        },
        body,
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
      if (res.ok && j.id) return { ok: true, id: j.id };
      const error = `Resend ${res.status}${j.name ? ` ${j.name}` : ""}: ${j.message || "gagal"}`;
      // Coba sekali lagi hanya untuk batas laju / gangguan server Resend.
      if (attempt === 1 && (res.status === 429 || res.status >= 500)) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      return { ok: false, error };
    } catch (e) {
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      return { ok: false, error: `Resend tidak terjangkau: ${(e as Error).message}` };
    }
  }
  return { ok: false, error: "gagal" };
}
