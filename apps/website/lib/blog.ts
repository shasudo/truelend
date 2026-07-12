import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

/*
 * Build-time only: called from generateStaticParams / static list pages, so
 * fs never runs on the Workers runtime. A bad frontmatter fails the build,
 * not production.
 */

const frontmatterSchema = z.object({
  title: z.string().min(1),
  date: z.coerce.date(),
  excerpt: z.string().min(1),
  tag: z.string().min(1),
  author: z.string().default("TrueLend Advisory Desk"),
});

export interface PostMeta extends z.infer<typeof frontmatterSchema> {
  slug: string;
}

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export function getAllPosts(): PostMeta[] {
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const { data } = matter(fs.readFileSync(path.join(BLOG_DIR, f), "utf8"));
      return { ...frontmatterSchema.parse(data), slug: f.replace(/\.mdx$/, "") };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export const postBySlug = (slug: string) => getAllPosts().find((p) => p.slug === slug);

export const formatPostDate = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(date);
