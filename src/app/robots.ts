import type { MetadataRoute } from "next";
import { siteIndexable, siteUrl } from "@/config/company";

export default function robots(): MetadataRoute.Robots {
  if (!siteIndexable) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/anfrage/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
