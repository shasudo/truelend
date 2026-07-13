import type { Metadata } from "next";
import { Container } from "@truelend/ui";
import { PageHeader } from "@/components/page-header";
import { PostCard } from "@/components/post-card";
import { CtaBand } from "@/components/cta-band";
import { Reveal } from "@/components/reveal";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Plain-speaking notes on credit scores, loan pricing and borrowing strategy from the TrueLend advisory desk.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <>
      <PageHeader
        eyebrow="The ledger"
        title="Borrowing, explained without the fine print"
        lede="Notes from our advisory desk — the arithmetic, the policy quirks and the negotiating leverage lenders assume you don't know."
      />
      <section>
        <Container className="py-16 sm:py-20">
          {posts.length === 0 ? (
            <p className="text-navy-600">New articles are on the way.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <Reveal key={post.slug} delay={(i % 3) * 0.06}>
                  <PostCard post={post} />
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
