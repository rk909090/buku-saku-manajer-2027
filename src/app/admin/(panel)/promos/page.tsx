import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { PromosClient } from "@/components/admin/promos-client";

export const metadata: Metadata = { title: "Diskon & Kupon" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PromosClient />
    </Suspense>
  );
}
