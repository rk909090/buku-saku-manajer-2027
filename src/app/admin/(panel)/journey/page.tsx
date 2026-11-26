import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { JourneyClient } from "@/components/admin/journey-client";

export const metadata: Metadata = { title: "Perjalanan Pengunjung" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <JourneyClient />
    </Suspense>
  );
}
