import type { Metadata, Viewport } from "next";
import { Oswald, Plus_Jakarta_Sans } from "next/font/google";
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
