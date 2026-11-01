import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/company";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/impressum`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/datenschutz`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
