import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source — let Next transpile them.
  transpilePackages: [
    "@truelend/db",
    "@truelend/email",
    "@truelend/reference",
    "@truelend/types",
    "@truelend/ui",
  ],
  // Security headers on every response. HSTS has no `preload` on purpose —
  // preload is an irreversible commitment for the whole apex + subdomains;
  // add it once you're sure every subdomain is HTTPS-only. The CSP here only
  // sets frame-ancestors (clickjacking) — a full script/style CSP needs nonce
  // wiring + testing, so it's left as a follow-up.
  // ponytail: this block is duplicated in the admin/partners configs — a
  // config-time shared import is fragile, so 3 copies of a static list it is.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

// Blog posts are .mdx files compiled into the bundle at build time — no
// runtime fs, which Workers doesn't have. remark-frontmatter strips the YAML
// block from rendered output; lib/blog.ts reads it separately via gray-matter.
const withMDX = createMDX({ options: { remarkPlugins: [remarkFrontmatter] } });

export default withMDX(nextConfig);

// Makes Cloudflare bindings (Hyperdrive, R2, …) available via
// getCloudflareContext() during `next dev`. No-op in production builds.
initOpenNextCloudflareForDev();
