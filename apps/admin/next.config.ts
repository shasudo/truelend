import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const csp =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; " +
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; ` +
  `style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'${process.env.NODE_ENV === "development" ? " ws: http:" : ""}; ` +
  `worker-src 'self' blob:; manifest-src 'self'${process.env.NODE_ENV === "development" ? "" : "; upgrade-insecure-requests"}`;

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source — let Next transpile them.
  transpilePackages: [
    "@truelend/auth",
    "@truelend/db",
    "@truelend/email",
    "@truelend/health",
    "@truelend/reference",
    "@truelend/types",
    "@truelend/ui",
  ],
  // Security headers on every response. Next emits inline bootstrap scripts,
  // hence unsafe-inline; all network and embedding destinations stay closed.
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

// Makes Cloudflare bindings (Hyperdrive, …) and .dev.vars available via
// getCloudflareContext() during `next dev`. No-op in production builds.
// Development binding injection can inline local connection strings when it is
// evaluated during a production build, so never initialize it outside next dev.
if (process.env.NODE_ENV === "development") {
  // wrangler's getPlatformProxy resolves the Hyperdrive local connection string
  // from process.env, but our local secrets live in .dev.vars (which only
  // injects Worker bindings). Bridge the override across before init so dev
  // connects to the real database instead of the localhost placeholder.
  const hyperdriveKey = "CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE";
  if (!process.env[hyperdriveKey]) {
    try {
      const line = readFileSync(".dev.vars", "utf8")
        .split("\n")
        .find((l) => l.startsWith(`${hyperdriveKey}=`));
      if (line) process.env[hyperdriveKey] = line.slice(hyperdriveKey.length + 1).trim();
    } catch {
      // no .dev.vars — nothing to bridge
    }
  }
  void initOpenNextCloudflareForDev();
}
