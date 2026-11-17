import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "@/components/admin/login-client";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-slate-950" />}>
      <LoginClient />
    </Suspense>
  );
}
