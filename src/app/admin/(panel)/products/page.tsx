import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/admin/ui";
import { ProductsClient } from "@/components/admin/products-client";

export const metadata: Metadata = { title: "Produk" };

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductsClient />
    </Suspense>
  );
}
