import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { UsersClient } from "@/components/admin/users-client";

export const metadata: Metadata = { title: "Admin & Akun" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <UsersClient />
    </Suspense>
  );
}
