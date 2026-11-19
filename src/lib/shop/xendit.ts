import "server-only";
import { env } from "@/lib/shop/env";

/**
 * Klien Xendit Payment Sessions (https://docs.xendit.co/apidocs/create-session.md).
 *  - Auth: HTTP Basic, secret key sebagai username, password kosong.
 *  - POST /sessions  (session_type PAY, mode PAYMENT_LINK) → `payment_link_url`
 *  - GET  /sessions/{payment_session_id} → konfirmasi status di sisi server
 * Status sesi: ACTIVE | COMPLETED | EXPIRED | CANCELED.
 */
const BASE = "https://api.xendit.co";

export class XenditError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export type XenditSession = {
  payment_session_id: string;
  reference_id: string;
  status: "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELED";
  amount: number;
  currency: string;
  payment_link_url: string;
  payment_id?: string | null;
  expires_at?: string;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = env.xenditKey();
  if (!key) throw new XenditError("XENDIT_SECRET_KEY belum diisi di environment", 503);
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Authorization: "Basic " + Buffer.from(key + ":").toString("base64"),
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* biarkan kosong */
  }
  if (!res.ok) {
    throw new XenditError(
      typeof json.message === "string" ? json.message : `HTTP ${res.status}`,
      res.status,
      typeof json.error_code === "string" ? json.error_code : undefined
    );
  }
  return json as T;
}

export type CreateSessionInput = {
  referenceId: string;
  amount: number;
  description: string;
  customer: { referenceId: string; email: string; mobileNumber: string; givenNames: string; surname?: string };
  items: { referenceId: string; type: "PHYSICAL_PRODUCT" | "FEE"; name: string; category: string; netUnitAmount: number; quantity: number }[];
  successReturnUrl: string;
  cancelReturnUrl: string;
  expiresAt: Date;
  /** Batasi metode di halaman bayar Xendit (`allowed_payment_channels`). Kosong/undefined = semua metode aktif. */
  allowedChannels?: string[];
};

export function createPaymentSession(i: CreateSessionInput) {
  return call<XenditSession>("/sessions", {
    method: "POST",
    body: JSON.stringify({
      reference_id: i.referenceId,
      session_type: "PAY",
      mode: "PAYMENT_LINK",
      amount: i.amount,
      currency: "IDR",
      country: "ID",
      locale: "id",
      description: i.description,
      customer: {
        reference_id: i.customer.referenceId,
        type: "INDIVIDUAL",
        email: i.customer.email,
        mobile_number: i.customer.mobileNumber,
        individual_detail: {
          given_names: i.customer.givenNames,
          ...(i.customer.surname ? { surname: i.customer.surname } : {}),
        },
      },
      items: i.items.map((it) => ({
        reference_id: it.referenceId,
        type: it.type,
        name: it.name,
        category: it.category,
        net_unit_amount: it.netUnitAmount,
        quantity: it.quantity,
      })),
      success_return_url: i.successReturnUrl,
      cancel_return_url: i.cancelReturnUrl,
      expires_at: i.expiresAt.toISOString(),
      ...(i.allowedChannels?.length ? { allowed_payment_channels: i.allowedChannels } : {}),
    }),
  });
}

export function getPaymentSession(id: string) {
  return call<XenditSession>(`/sessions/${encodeURIComponent(id)}`);
}
