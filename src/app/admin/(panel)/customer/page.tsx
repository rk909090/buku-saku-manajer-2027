import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { CustomerDetailClient } from "@/components/admin/customers-client";

export const metadata: Metadata = { title: "Detail pelanggan" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CustomerDetailClient />
    </Suspense>
  );
}
