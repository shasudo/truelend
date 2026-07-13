import type { MetadataRoute } from "next";

const baseUrl = "https://partner.truelend.in";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/register`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/resources`, changeFrequency: "weekly", priority: 0.6 },
  ];
}
