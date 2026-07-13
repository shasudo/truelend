import { blogIndex } from "@/content/blog-index";

export interface PostMeta {
  slug: string;
  title: string;
  date: Date;
  excerpt: string;
  tag: string;
  author: string;
}

export function getAllPosts(): PostMeta[] {
  return blogIndex
    .map((post) => ({ ...post, date: new Date(`${post.date}T00:00:00.000Z`) }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export const postBySlug = (slug: string) => getAllPosts().find((p) => p.slug === slug);

export const formatPostDate = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(date);
