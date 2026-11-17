import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { getHeadlineVariant, headlineVariants } from "@/lib/content";

/** Satu halaman statis per varian headline; disajikan lewat rewrite dari src/proxy.ts. */
export function generateStaticParams() {
  return headlineVariants.map((v) => ({ variant: v.id }));
}

export const metadata: Metadata = {
  // Semua varian adalah halaman yang sama ("/") di mata mesin pencari.
  alternates: { canonical: "/" },
};

export default async function VariantPage({ params }: PageProps<"/v/[variant]">) {
  const { variant } = await params;
  const v = getHeadlineVariant(variant);
  if (!v) notFound();
  return <LandingPage variant={v} />;
}
