import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { OverviewClient } from "@/components/admin/overview-client";

export const metadata: Metadata = { title: "Ringkasan" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <OverviewClient />
    </Suspense>
  );
}
