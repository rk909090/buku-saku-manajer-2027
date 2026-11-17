import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { SettingsClient } from "@/components/admin/settings-client";

export const metadata: Metadata = { title: "Pengaturan" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <SettingsClient />
    </Suspense>
  );
}
