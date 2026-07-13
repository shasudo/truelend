import Link from "next/link";
import { MoveUpRight } from "lucide-react";
import { Badge, Card } from "@truelend/ui";
import { formatPostDate, type PostMeta } from "@/lib/blog";

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col p-6 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-navy-800/35 group-hover:shadow-[0_8px_30px_-12px_rgba(20,32,74,0.25)]">
        <div className="flex items-center gap-3">
          <Badge>{post.tag}</Badge>
          <time dateTime={post.date.toISOString()} className="text-xs text-muted">
            {formatPostDate(post.date)}
          </time>
        </div>
        <h3 className="mt-4 text-balance font-display text-lg font-bold leading-snug text-navy-950">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-navy-600">{post.excerpt}</p>
        <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold text-red-600">
          Read article
          <MoveUpRight
            aria-hidden
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </Card>
    </Link>
  );
}
