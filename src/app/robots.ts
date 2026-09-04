import type { MetadataRoute } from "next";
import { configuredSiteOrigin } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = configuredSiteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  };
}
