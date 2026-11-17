import type { MetadataRoute } from "next";

/** Hanya halaman publik. /v/* (target rewrite A/B) dan /ab (internal) sengaja tidak dicantumkan. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://bsm.humplus.com/",
      lastModified: new Date("2026-11-17"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
