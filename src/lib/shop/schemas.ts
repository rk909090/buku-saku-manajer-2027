import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9-]{1,64}$/);
export const cartLines = z.array(z.object({ slug, qty: z.number().int().min(1).max(100) })).min(1).max(20);

export const ratesBody = z.object({
  areaId: z.string().min(3).max(64),
  lines: cartLines,
});

export const orderBody = z.object({
  lines: cartLines,
  customer: z.object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
    email: z.string().trim().max(50, "Email maksimal 50 karakter").pipe(z.email("Email tidak valid")),
    phone: z.string().trim().regex(/^\d{8,15}$/, "Nomor WhatsApp hanya boleh angka (8–15 digit)"),
  }),
  shipping: z.object({
    recipientName: z.string().trim().min(2).max(120),
    recipientPhone: z.string().trim().regex(/^\d{8,15}$/, "Nomor HP penerima hanya boleh angka (8–15 digit)"),
    address: z.string().trim().min(10, "Alamat lengkap minimal 10 karakter").max(500),
    areaId: z.string().min(3).max(64),
    areaName: z.string().min(3).max(255),
    postalCode: z.string().max(10).nullable(),
    notes: z.string().trim().max(500).nullable(),
  }),
  courier: z.object({ code: z.string().min(1).max(32), serviceCode: z.string().min(1).max(48) }),
  couponCode: z.string().trim().max(32).nullable().optional(),
});

export const couponBody = z.object({
  code: z.string().trim().min(1, "Isi kode kupon").max(32, "Kode kupon tidak valid"),
  lines: cartLines,
  shippingCost: z.number().int().min(0).max(100_000_000).nullable(),
  email: z.string().trim().max(50).nullable(),
});
