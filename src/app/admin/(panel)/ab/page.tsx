import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { AbClient } from "@/components/admin/ab-client";

export const metadata: Metadata = { title: "Analitik A/B" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AbClient />
    </Suspense>
  );
}
