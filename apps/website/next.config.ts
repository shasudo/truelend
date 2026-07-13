import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const csp =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; " +
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; ` +
  "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; " +
  `connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com${process.env.NODE_ENV === "development" ? " ws: http:" : ""}; ` +
  `frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; manifest-src 'self'${process.env.NODE_ENV === "development" ? "" : "; upgrade-insecure-requests"}`;

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source — let Next transpile them.
  transpilePackages: [
    "@truelend/db",
    "@truelend/email",
    "@truelend/health",
    "@truelend/reference",
    "@truelend/turnstile",
    "@truelend/types",
    "@truelend/ui",
  ],
  // Security headers on every response. HSTS has no `preload` on purpose —
  // preload is an irreversible commitment for the whole apex + subdomains;
  // add it once you're sure every subdomain is HTTPS-only. Next emits inline
  // bootstrap scripts; third-party allowances are limited to Turnstile and
  // Cloudflare Web Analytics.
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
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
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

// Development binding injection can inline local connection strings when it is
// evaluated during a production build, so never initialize it outside next dev.
if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev();
}
