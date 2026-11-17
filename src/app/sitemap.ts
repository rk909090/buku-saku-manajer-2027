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
        `${SITE_URL}/images/bsm-cover.png`,
        `${SITE_URL}/images/bsm-mockup.webp`,
        `${SITE_URL}/images/bsm-isi-smart.webp`,
        `${SITE_URL}/images/bsm-daftar-isi.webp`,
        `${SITE_URL}/images/armala-pegang-buku-saku.jpeg`,
      ],
    },
  ];
}
