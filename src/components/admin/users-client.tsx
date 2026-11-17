"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/api";
import { useMe } from "@/components/admin/shell";
import { Alert, Badge, Button, Card, Field, inputCls, Loading, PageHeader } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";

type User = { id: number; email: string; name: string; role: "owner" | "admin"; active: number; last_login_at: string | null; created_at: string };

export function UsersClient() {
  const me = useMe();
  const isOwner = me?.admin.role === "owner";
  const [users, setUsers] = useState<User[] | null>(null);
  const [msg, setMsg] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [form, setForm] = useState({ email: "", name: "", role: "admin", password: "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState("");

  useEffect(() => {
    adminFetch<{ users: User[] }>("/api/admin/users").then((j) => setUsers(j.users)).catch((e) => setMsg({ tone: "red", text: (e as Error).message }));
  }, []);

  async function run(key: string, fn: () => Promise<void>, ok: string) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "green", text: ok });
    } catch (e) {
      setMsg({ tone: "red", text: (e as Error).message });
    } finally {
      setBusy("");
    }
  }

  const patch = (u: User, body: Record<string, unknown>, ok: string) =>
    run(`u${u.id}`, async () => setUsers((await adminFetch<{ users: User[] }>(`/api/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify(body) })).users), ok);

  return (
    <>
      <PageHeader title="Admin & Akun" subtitle="Siapa saja yang bisa masuk ke dashboard" />
      {msg && <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Daftar admin">
          {!users ? (
            <Loading />
          ) : (
            <ul className="-my-2 divide-y divide-slate-100">
              {users.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-sm font-semibold uppercase">{u.name.slice(0, 1)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {u.name} {u.id === me?.admin.id && <span className="text-xs text-slate-500">(Anda)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {u.email} · login terakhir {formatDateTime(u.last_login_at)}
                    </p>
                  </div>
                  <Badge tone={u.role === "owner" ? "violet" : "slate"}>{u.role === "owner" ? "Owner" : "Admin"}</Badge>
                  {!u.active && <Badge tone="red">Nonaktif</Badge>}
                  {isOwner && u.id !== me?.admin.id && (
                    <div className="flex gap-1">
                      <Button variant="ghost" loading={busy === `u${u.id}`} onClick={() => patch(u, { active: !u.active }, u.active ? "Admin dinonaktifkan" : "Admin diaktifkan")}>
                        {u.active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          const p = window.prompt(`Password baru untuk ${u.email} (min. 10 karakter):`);
                          if (p) patch(u, { password: p }, "Password direset; sesi lama dikeluarkan");
                        }}
                      >
                        Reset password
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          {isOwner && (
            <Card title="Tambah admin">
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(
                    "add",
                    async () => {
                      setUsers((await adminFetch<{ users: User[] }>("/api/admin/users", { method: "POST", body: JSON.stringify(form) })).users);
                      setForm({ email: "", name: "", role: "admin", password: "" });
                    },
                    "Admin ditambahkan"
                  );
                }}
              >
                <Field label="Nama"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                <Field label="Email"><input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
                <Field label="Peran">
                  <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="admin">Admin — kelola pesanan, pelanggan, produk, pengaturan</option>
                    <option value="owner">Owner — semua, termasuk kelola admin</option>
                  </select>
                </Field>
                <Field label="Password awal" hint="Minimal 10 karakter. Minta admin baru menggantinya setelah login.">
                  <input className={inputCls} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </Field>
                <Button type="submit" loading={busy === "add"}>Tambah admin</Button>
              </form>
            </Card>
          )}
          <Card title="Ganti password saya">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                run("pw", async () => {
                  await adminFetch("/api/admin/account", { method: "PATCH", body: JSON.stringify(pw) });
                  setPw({ current: "", next: "" });
                }, "Password diganti");
              }}
            >
              <Field label="Password saat ini"><input className={inputCls} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required /></Field>
              <Field label="Password baru" hint="Minimal 10 karakter"><input className={inputCls} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required /></Field>
              <Button type="submit" loading={busy === "pw"}>Ganti password</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
