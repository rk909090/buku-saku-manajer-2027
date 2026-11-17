import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Hanya halaman publik. /v/* (target rewrite A/B) dan /ab (internal) sengaja tidak dicantumkan. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date("2026-11-17"),
      changeFrequency: "weekly",
      priority: 1,
      images: [
        `${SITE_URL}/images/buku/sampul-foto.webp`,
        `${SITE_URL}/images/buku/sampul-depan.jpg`,
        `${SITE_URL}/images/buku/tumpukan-buku.webp`,
        `${SITE_URL}/images/buku/isi-bab2-hal-70-71.webp`,
        `${SITE_URL}/images/buku/isi-bab4-hal-116-117.webp`,
        `${SITE_URL}/images/buku/isi-bab3-hal-138-139.webp`,
        `${SITE_URL}/images/buku/isi-bab5-hal-192-193.webp`,
        `${SITE_URL}/images/buku/tumpukan-buku-tegak.webp`,
        `${SITE_URL}/images/buku/membaca-bab-goal.webp`,
        `${SITE_URL}/images/buku/pembatas-mengukur-kinerja.webp`,
        `${SITE_URL}/images/armala-pegang-buku-saku.jpeg`,
      ],
    },
  ];
}
