import type { MetadataRoute } from "next";
import { appUrls } from "@truelend/reference";

const baseUrl = appUrls.partners;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/register/business`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/register/referral`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/resources`, changeFrequency: "weekly", priority: 0.6 },
  ];
}
