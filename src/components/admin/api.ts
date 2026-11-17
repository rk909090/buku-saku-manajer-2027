"use client";

/** Fetch ke /api/admin/* — 401 mengarahkan ke halaman login. */
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (res.status === 401) {
    const next = encodeURIComponent(location.pathname + location.search);
    // Muat ulang penuh ke halaman login agar state dashboard dibuang.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.assign(`/admin/login?next=${next}`);
    throw new Error("Sesi berakhir, silakan login kembali");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Gagal (HTTP ${res.status})`);
  return json as T;
}
