import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { OrderDetailClient } from "@/components/admin/order-detail-client";

export const metadata: Metadata = { title: "Detail pesanan" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <OrderDetailClient />
    </Suspense>
  );
}
