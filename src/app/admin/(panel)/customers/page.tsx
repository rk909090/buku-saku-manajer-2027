import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { CustomersClient } from "@/components/admin/customers-client";

export const metadata: Metadata = { title: "Pelanggan" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <CustomersClient />
    </Suspense>
  );
}
