import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { loadHyperdriveDevOverride } from "../../scripts/load-hyperdrive-dev-override.mjs";

const csp =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; " +
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; ` +
  "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; " +
  `connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com${process.env.NODE_ENV === "development" ? " ws: http:" : ""}; ` +
  `frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; manifest-src 'self'${process.env.NODE_ENV === "development" ? "" : "; upgrade-insecure-requests"}`;

const nextConfig: NextConfig = {
  transpilePackages: [
    "@truelend/auth",
    "@truelend/db",
    "@truelend/email",
    "@truelend/health",
    "@truelend/reference",
    "@truelend/turnstile",
    "@truelend/ui",
  ],
  // Security headers on every response. Next emits inline bootstrap scripts,
  // hence unsafe-inline; third-party allowances are limited to Turnstile and
  // Cloudflare Web Analytics.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
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

export default nextConfig;

// Evaluating development bindings during a production build can inline local
// connection strings, so initialize them only for next dev.
if (process.env.NODE_ENV === "development") {
  loadHyperdriveDevOverride();
  void initOpenNextCloudflareForDev();
}
