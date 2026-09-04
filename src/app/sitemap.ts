import type { MetadataRoute } from "next";
import { configuredSiteOrigin } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteOrigin = configuredSiteOrigin();
  return [
    {
      url: siteOrigin,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
  ];
}
