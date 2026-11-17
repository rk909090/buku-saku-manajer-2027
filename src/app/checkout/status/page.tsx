import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderStatusClient } from "@/components/shop/order-status-client";

export const metadata: Metadata = { title: "Status Pesanan — Buku Saku Manajer" };

export default function OrderStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <OrderStatusClient />
    </Suspense>
  );
}
