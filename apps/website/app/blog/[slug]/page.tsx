import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Container } from "@truelend/ui";
import { CtaBand } from "@/components/cta-band";
import { getAllPosts, postBySlug, formatPostDate } from "@/lib/blog";

// Fully static: posts compile into the bundle at build time (Workers has no
// runtime fs); unknown slugs 404 via dynamicParams=false.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = postBySlug((await params).slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();

  const { default: Post } = await import(`@/content/blog/${slug}.mdx`);

  return (
    <>
      <article>
        <header className="border-b border-hairline">
          <Container className="max-w-3xl py-14 sm:py-16">
            <nav aria-label="Breadcrumb" className="text-sm text-navy-500">
              <Link href="/blog" className="transition-colors hover:text-navy-800">
                Blog
              </Link>
              <span aria-hidden> / </span>
              <span className="text-navy-800">{post.tag}</span>
            </nav>
            <h1 className="mt-5 text-balance font-display text-3xl font-extrabold tracking-tight text-navy-950 sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-navy-500">
              <Badge>{post.tag}</Badge>
              <span>{post.author}</span>
              <span aria-hidden>·</span>
              <time dateTime={post.date.toISOString()}>{formatPostDate(post.date)}</time>
            </div>
          </Container>
        </header>
        <Container className="max-w-3xl py-12 sm:py-16">
          <div className="prose max-w-none prose-headings:font-display prose-headings:tracking-tight prose-headings:text-navy-950 prose-p:text-navy-700 prose-a:font-semibold prose-a:text-red-600 prose-strong:text-navy-900 prose-li:text-navy-700 prose-blockquote:border-red-600 prose-em:text-navy-800">
            <Post />
          </div>
        </Container>
      </article>
      <CtaBand />
    </>
  );
}
