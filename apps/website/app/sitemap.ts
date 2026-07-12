import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { products } from "@/content/products";
import { getAllPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { path: "", priority: 1 },
    { path: "/products", priority: 0.9 },
    { path: "/enquiry", priority: 0.9 },
    { path: "/about", priority: 0.6 },
    { path: "/refer", priority: 0.6 },
    { path: "/blog", priority: 0.6 },
    { path: "/cibil-score", priority: 0.5 },
    { path: "/contact", priority: 0.5 },
    { path: "/privacy", priority: 0.2 },
    { path: "/terms", priority: 0.2 },
  ].map(({ path, priority }) => ({
    url: `${site.url}${path}`,
    changeFrequency: "weekly" as const,
    priority,
  }));

  const productPages = products.map((p) => ({
    url: `${site.url}/products/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const posts = getAllPosts().map((p) => ({
    url: `${site.url}/blog/${p.slug}`,
    lastModified: p.date,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...pages, ...productPages, ...posts];
}
