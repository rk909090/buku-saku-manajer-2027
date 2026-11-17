"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Alert, Button, Field, inputCls } from "@/components/admin/ui";

export function LoginClient() {
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Hanya izinkan kembali ke halaman dashboard (cegah open redirect).
  const rawNext = sp.get("next") || "/admin";
  const next = rawNext.startsWith("/admin") && !rawNext.startsWith("//") && !rawNext.startsWith("/admin/login") ? rawNext : "/admin";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Gagal masuk");
      location.assign(next);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-lg font-black text-slate-950">H</span>
          <h1 className="mt-4 text-2xl font-bold text-white">Dashboard Toko</h1>
          <p className="mt-1 text-sm text-slate-400">Buku Saku Manajer — Human Plus Institute</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
          {error && <Alert>{error}</Alert>}
          <Field label="Email">
            <input className={inputCls} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Button type="submit" loading={loading} className="w-full py-3">
            <Lock className="size-4" /> Masuk
          </Button>
        </form>
      </div>
    </div>
  );
}
