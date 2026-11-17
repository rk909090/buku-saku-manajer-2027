import { z } from "zod";

/** Waktu dikirim dashboard sebagai ISO 8601 dengan offset (+07:00 untuk WIB). null = tanpa batas. */
const when = z.iso.datetime({ offset: true }).nullable();
const endAfterStart = (d: { starts_at: string | null; ends_at: string | null }) =>
  !d.starts_at || !d.ends_at || Date.parse(d.ends_at) > Date.parse(d.starts_at);

export const discountBody = z
  .object({
    name: z.string().trim().min(2, "Nama diskon minimal 2 karakter").max(120),
    product_id: z.number().int().positive().nullable(),
    type: z.enum(["percent", "fixed"]),
    value: z.number().int().min(1, "Nilai diskon minimal 1").max(100_000_000),
    starts_at: when,
    ends_at: when,
    active: z.boolean(),
  })
  .refine((d) => d.type !== "percent" || d.value <= 100, { message: "Persentase maksimal 100", path: ["value"] })
  .refine(endAfterStart, { message: "Waktu berakhir harus setelah waktu mulai", path: ["ends_at"] });

export const couponAdminBody = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,32}$/, "Kode 3–32 karakter: huruf, angka, tanda - atau _"),
    description: z.string().trim().max(255).nullable(),
    type: z.enum(["percent", "fixed", "free_shipping"]),
    value: z.number().int().min(0).max(100_000_000),
    max_discount: z.number().int().min(1).max(100_000_000).nullable(),
    min_subtotal: z.number().int().min(1).max(100_000_000).nullable(),
    starts_at: when,
    ends_at: when,
    usage_limit: z.number().int().min(1).max(1_000_000).nullable(),
    per_customer_limit: z.number().int().min(1).max(1000).nullable(),
    active: z.boolean(),
  })
  .refine((d) => d.type !== "percent" || (d.value >= 1 && d.value <= 100), { message: "Persentase harus 1–100", path: ["value"] })
  .refine((d) => d.type !== "fixed" || d.value >= 1, { message: "Nilai potongan minimal Rp1", path: ["value"] })
  .refine(endAfterStart, { message: "Waktu berakhir harus setelah waktu mulai", path: ["ends_at"] });

export function firstIssue(e: z.ZodError) {
  const i = e.issues[0];
  return i?.message || "Data tidak valid";
}
