import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { OrdersClient } from "@/components/admin/orders-client";

export const metadata: Metadata = { title: "Pesanan" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <OrdersClient />
    </Suspense>
  );
}
