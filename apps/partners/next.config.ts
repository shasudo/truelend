import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@truelend/auth",
    "@truelend/db",
    "@truelend/email",
    "@truelend/reference",
    "@truelend/types",
    "@truelend/ui",
  ],
  // Security headers on every response. Partner portal → DENY all framing.
  // HSTS has no `preload` on purpose (see website config). CSP sets only
  // frame-ancestors; a full CSP is a follow-up.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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

// Makes Cloudflare bindings (Hyperdrive, R2, …) and .dev.vars available via
// getCloudflareContext() during `next dev`. No-op in production builds.
initOpenNextCloudflareForDev();
