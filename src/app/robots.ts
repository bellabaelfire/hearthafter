import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep pages crawlable so their noindex metadata can be read.
      // Public rendering needs /api/content and /_next/ assets.
      disallow: ["/api/session", "/api/placements"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
