import "server-only";

/**
 * Kunci API dibaca dari environment variable (diisi pemilik di hPanel > Node.js >
 * Environment variables). Tidak pernah ditulis di kode atau dikirim ke browser.
 *
 *   BITESHIP_API_KEY        — kunci API Biteship (biteship_live.… / biteship_test.…)
 *   XENDIT_SECRET_KEY       — secret key Xendit (xnd_production_… / xnd_development_…)
 *   XENDIT_WEBHOOK_TOKEN    — "Webhook verification token" dari dashboard Xendit
 *   ADMIN_BOOTSTRAP_EMAIL   — email admin pertama (dipakai hanya bila belum ada admin)
 *   ADMIN_BOOTSTRAP_PASSWORD— password awal admin pertama (ganti setelah login)
 *   RESEND_API_KEY          — API key Resend (re_…) untuk email notifikasi
 *   EMAIL_FROM              — opsional; default "Buku Saku Manajer <noreply@humplus.com>"
 */
export const env = {
  biteshipKey: () => process.env.BITESHIP_API_KEY?.trim() || "",
  xenditKey: () => process.env.XENDIT_SECRET_KEY?.trim() || "",
  xenditWebhookToken: () => process.env.XENDIT_WEBHOOK_TOKEN?.trim() || "",
  bootstrapEmail: () => process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase() || "",
  bootstrapPassword: () => process.env.ADMIN_BOOTSTRAP_PASSWORD || "",
  resendKey: () => process.env.RESEND_API_KEY?.trim() || "",
  emailFrom: () => process.env.EMAIL_FROM?.trim() || "Buku Saku Manajer <noreply@humplus.com>",
};

export const SITE_ORIGIN = "https://bsm.humplus.com";

/** Status konfigurasi untuk ditampilkan di dashboard (tanpa membocorkan nilai). */
export function integrationStatus() {
  const b = env.biteshipKey();
  const x = env.xenditKey();
  return {
    biteship: b ? (b.startsWith("biteship_test.") ? "test" : b.startsWith("biteship_live.") ? "live" : "set") : "missing",
    xendit: x ? (x.startsWith("xnd_development_") ? "test" : x.startsWith("xnd_production_") ? "live" : "set") : "missing",
    xenditWebhook: env.xenditWebhookToken() ? "set" : "missing",
    resend: env.resendKey() ? "set" : "missing",
  } as const;
}
