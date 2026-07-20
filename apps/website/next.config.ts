import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { loadHyperdriveDevOverride } from "../../scripts/load-hyperdrive-dev-override.mjs";

const csp =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; " +
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; ` +
  "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; " +
  `connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com${process.env.NODE_ENV === "development" ? " ws: http:" : ""}; ` +
  `frame-src https://challenges.cloudflare.com https://www.openstreetmap.org; worker-src 'self' blob:; manifest-src 'self'${process.env.NODE_ENV === "development" ? "" : "; upgrade-insecure-requests"}`;

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source — let Next transpile them.
  transpilePackages: [
    "@truelend/db",
    "@truelend/email",
    "@truelend/health",
    "@truelend/reference",
    "@truelend/turnstile",
    "@truelend/ui",
  ],
  // Security headers on every response. HSTS has no `preload` on purpose —
  // preload is an irreversible commitment for the whole apex + subdomains;
  // add it once you're sure every subdomain is HTTPS-only. Next emits inline
  // bootstrap scripts; third-party allowances are limited to Turnstile and
  // Cloudflare Web Analytics.
  // Each host keeps this block explicit because its CSP and framing policy are
  // intentionally different; do not mechanically merge the three configs.
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

// Blog posts are compiled into the bundle. remark-frontmatter strips YAML from
// rendered output; generate-blog-index.ts validates and indexes that metadata.
const withMDX = createMDX({ options: { remarkPlugins: [remarkFrontmatter] } });

export default withMDX(nextConfig);

// Evaluating development bindings during a production build can inline local
// connection strings, so initialize them only for next dev.
if (process.env.NODE_ENV === "development") {
  loadHyperdriveDevOverride();
  void initOpenNextCloudflareForDev();
}
