import type { Metadata, Viewport } from "next";
import { Oswald, Plus_Jakarta_Sans } from "next/font/google";
import { GOOGLE_TAG_ID } from "@/lib/analytics";
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
  metadataBase: new URL("https://bsm.humplus.com"),
  // Judul & deskripsi diambil dari meta halaman Scalev (humanplusinstitute.myscalev.com/bukusakumanajer)
  title: "Buku Saku Manajer Edisi Kedua | Panduan Praktis Manajemen — Human Plus Institute",
  description:
    "Panduan praktis untuk Supervisor, Manager, Direktur, dan Business Owner: 6 bab yang menjawab masalah nyata manajer sehari-hari. Buku Saku Manajer Edisi Kedua karya Armala.",
  openGraph: {
    title: "Buku Saku Manajer",
    description:
      "Pelajari cara mengelola pekerjaan, tim, dan bisnis secara lebih terarah melalui framework G.P.E.R. dalam Buku Saku Manajer karya Armala.",
    images: [{ url: "/images/bsm-mockup.webp", width: 560, height: 560 }],
    locale: "id_ID",
    type: "website",
  },
  // Google Search Console diverifikasi lewat DNS TXT (bsm.humplus.com), jadi tidak butuh meta di sini.
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
      <head>
        {/* Google tag (GA4 "Buku Saku Manajer 2027", G-VCW01D9KTE) — snippet persis seperti
            di GA4 > Data streams > View tag instructions > Install manually. */}
        <script async src={`https://www.googletagmanager.com/gtm.js?id=${GOOGLE_TAG_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());`,
          }}
        />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
