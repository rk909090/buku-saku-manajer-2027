import { Suspense } from "react";
import { CheckoutClient } from "@/components/shop/checkout-client";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <CheckoutClient />
    </Suspense>
  );
}
