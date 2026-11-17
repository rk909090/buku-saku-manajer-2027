import type { Metadata, Viewport } from "next";
import { Oswald, Plus_Jakarta_Sans } from "next/font/google";
import { AUTHOR, OG_DESCRIPTION, ORGANIZATION, SEO_DESCRIPTION, SEO_TITLE, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR.name }],
  creator: AUTHOR.name,
  publisher: ORGANIZATION.legalName,
  category: "Buku manajemen",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  // Gambar OG/Twitter dibuat oleh src/app/opengraph-image.tsx & twitter-image.tsx (1200×630).
  openGraph: {
    type: "website",
    url: "/",
    siteName: `${SITE_NAME} — ${ORGANIZATION.name}`,
    title: SEO_TITLE,
    description: OG_DESCRIPTION,
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: OG_DESCRIPTION,
  },
  // Google Search Console: diverifikasi lewat DNS (CNAME di bsm.humplus.com), tidak butuh meta.
  verification: {
    other: { "msvalidate.01": "562657F865C47C6F67C9A5FFBB31D2B4" }, // Bing Webmaster Tools
  },
};

export const viewport: Viewport = {
  themeColor: "#070f1d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${oswald.variable} ${jakarta.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
