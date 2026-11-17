import type { MetadataRoute } from "next";

/** /v/* adalah target rewrite A/B (isinya sama dengan "/"), /ab adalah halaman internal. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/v/", "/ab", "/api/"] },
    sitemap: "https://bsm.humplus.com/sitemap.xml",
  };
}
