import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source — let Next transpile them.
  transpilePackages: ["@truelend/db", "@truelend/types", "@truelend/ui"],
};

// Blog posts are .mdx files compiled into the bundle at build time — no
// runtime fs, which Workers doesn't have. remark-frontmatter strips the YAML
// block from rendered output; lib/blog.ts reads it separately via gray-matter.
const withMDX = createMDX({ options: { remarkPlugins: [remarkFrontmatter] } });

export default withMDX(nextConfig);

// Makes Cloudflare bindings (Hyperdrive, R2, …) available via
// getCloudflareContext() during `next dev`. No-op in production builds.
initOpenNextCloudflareForDev();
