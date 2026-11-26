"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Route,
  Settings,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  Users,
  X,
} from "lucide-react";
import { adminFetch } from "@/components/admin/api";
import { Loading } from "@/components/admin/ui";

export type Me = {
  admin: { id: number; email: string; name: string; role: "owner" | "admin" };
  integrations: { biteship: string; xendit: string; xenditWebhook: string };
};

const MeContext = createContext<Me | null>(null);
export const useMe = () => useContext(MeContext);

const NAV = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Pesanan", icon: ShoppingBag, match: ["/admin/orders", "/admin/order"] },
  { href: "/admin/customers", label: "Pelanggan", icon: Users, match: ["/admin/customers", "/admin/customer"] },
  { href: "/admin/products", label: "Produk", icon: Package },
  { href: "/admin/promos", label: "Diskon & Kupon", icon: TicketPercent },
  { href: "/admin/journey", label: "Perjalanan Pengunjung", icon: Route },
  { href: "/admin/ab", label: "Analitik A/B", icon: FlaskConical },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
  { href: "/admin/users", label: "Admin & Akun", icon: ShieldCheck },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    adminFetch<Me>("/api/admin/me").then(setMe).catch((e) => setError((e as Error).message));
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tutup menu mobile saat pindah halaman
    setOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    // Muat ulang penuh agar state & cache dashboard dibuang setelah logout.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.assign("/admin/login");
  }

  const isActive = (n: (typeof NAV)[number]) =>
    n.exact ? pathname === n.href : (n.match || [n.href]).some((m) => pathname === m || pathname.startsWith(m + "/"));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 font-black text-slate-950">H</span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Buku Saku Manajer</p>
          <p className="text-xs text-slate-400">Dashboard Toko</p>
        </div>
      </div>
      <nav className="mt-2 flex-1 space-y-1 px-3" aria-label="Menu admin">
        {NAV.map((n) => {
          const active = isActive(n);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <n.icon className={`size-[18px] ${active ? "text-amber-400" : ""}`} />
              {n.label}
            </Link>
          );
        })}
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="size-[18px]" />
          Lihat situs
        </a>
      </nav>
      <div className="border-t border-white/10 p-3">
        {me && (
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-700 text-sm font-semibold text-white uppercase">
              {me.admin.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-white">{me.admin.name}</p>
              <p className="truncate text-xs text-slate-400">{me.admin.role === "owner" ? "Owner" : "Admin"}</p>
            </div>
            <button onClick={logout} aria-label="Keluar" title="Keluar" className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-950 lg:block">{sidebar}</aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button aria-label="Tutup menu" className="absolute inset-0 bg-slate-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-950 shadow-2xl">
            <button aria-label="Tutup menu" onClick={() => setOpen(false)} className="absolute top-4 right-3 grid size-9 place-items-center rounded-lg text-slate-400 hover:text-white">
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:hidden">
          <button aria-label="Buka menu" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl hover:bg-slate-100">
            <Menu className="size-5" />
          </button>
          <span className="font-semibold">Dashboard Toko</span>
          <BarChart3 className="ml-auto size-5 text-slate-400" aria-hidden="true" />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {error ? <p className="text-sm text-rose-700">{error}</p> : me ? <MeContext.Provider value={me}>{children}</MeContext.Provider> : <Loading />}
        </main>
      </div>
    </div>
  );
}
