import "server-only";
import { env } from "@/lib/shop/env";

/**
 * Klien Biteship (https://biteship.com/id/docs). Hanya untuk perhitungan ongkir.
 *  - Auth: header `Authorization: <API_KEY>` (dokumentasi: raw key atau Bearer diterima)
 *  - GET  /v1/maps/areas?countries=ID&input=…&type=single
 *  - POST /v1/rates/couriers  (berat dalam gram, dimensi dalam cm; field `price` = harga final)
 * Pemakaian dengan kunci live memotong kuota bulanan Maps/Rates, jadi hasil di-cache.
 */
const BASE = "https://api.biteship.com";

export class BiteshipError extends Error {
  constructor(message: string, public status: number, public code?: number) {
    super(message);
  }
}

export type Area = { id: string; name: string; postal_code: string | null };

export type RateOption = {
  courier_code: string;
  courier_service_code: string;
  courier_name: string;
  courier_service_name: string;
  description: string;
  price: number;
  etd: string;
};

export type RateItem = { name: string; value: number; weight: number; quantity: number; length?: number; width?: number; height?: number };

/* Cache sederhana di memori proses (per instance Node). */
type Entry<T> = { at: number; value: T };
function makeCache<T>(ttlMs: number, max: number) {
  const m = new Map<string, Entry<T>>();
  return {
    get(k: string) {
      const e = m.get(k);
      if (!e) return undefined;
      if (Date.now() - e.at > ttlMs) {
        m.delete(k);
        return undefined;
      }
      return e.value;
    },
    set(k: string, value: T) {
      if (m.size >= max) m.delete(m.keys().next().value as string);
      m.set(k, { at: Date.now(), value });
    },
  };
}
const areaCache = makeCache<Area[]>(24 * 60 * 60 * 1000, 500);
const rateCache = makeCache<RateOption[]>(10 * 60 * 1000, 500);

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = env.biteshipKey();
  if (!key) throw new BiteshipError("BITESHIP_API_KEY belum diisi di environment", 503);
  const res = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: key, "Content-Type": "application/json", ...(init?.headers || {}) },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* biarkan kosong */
  }
  if (!res.ok || json.success === false) {
    const msg = typeof json.error === "string" ? json.error : typeof json.message === "string" ? json.message : `HTTP ${res.status}`;
    throw new BiteshipError(msg, res.status, typeof json.code === "number" ? json.code : undefined);
  }
  return json as T;
}

export async function searchAreas(input: string): Promise<Area[]> {
  const q = input.trim().replace(/\s+/g, " ").toLowerCase();
  const cached = areaCache.get(q);
  if (cached) return cached;
  const data = await call<{ areas?: Record<string, unknown>[] }>(
    `/v1/maps/areas?countries=ID&type=single&input=${encodeURIComponent(q)}`
  );
  const areas: Area[] = (data.areas || []).slice(0, 12).map((a) => ({
    id: String(a.id),
    name: String(a.name),
    postal_code: a.postal_code != null ? String(a.postal_code) : null,
  }));
  areaCache.set(q, areas);
  return areas;
}

export async function getRates(args: {
  originAreaId: string;
  destinationAreaId: string;
  couriers: string;
  items: RateItem[];
}): Promise<RateOption[]> {
  const key = JSON.stringify(args);
  const cached = rateCache.get(key);
  if (cached) return cached;
  const data = await call<{ pricing?: Record<string, unknown>[] }>("/v1/rates/couriers", {
    method: "POST",
    body: JSON.stringify({
      origin_area_id: args.originAreaId,
      destination_area_id: args.destinationAreaId,
      couriers: args.couriers,
      items: args.items.map((i) => ({ ...i, category: "others" })),
    }),
  });
  const options: RateOption[] = (data.pricing || [])
    .map((p) => ({
      courier_code: String(p.courier_code ?? ""),
      courier_service_code: String(p.courier_service_code ?? ""),
      courier_name: String(p.courier_name ?? p.company ?? ""),
      courier_service_name: String(p.courier_service_name ?? ""),
      description: String(p.description ?? ""),
      price: Number(p.price),
      etd: String(p.duration ?? ""),
    }))
    .filter((o) => o.courier_code && o.courier_service_code && Number.isFinite(o.price) && o.price > 0)
    .sort((a, b) => a.price - b.price);
  rateCache.set(key, options);
  return options;
}
