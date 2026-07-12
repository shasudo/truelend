import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source — let Next transpile them.
  transpilePackages: ["@truelend/auth", "@truelend/db", "@truelend/types", "@truelend/ui"],
};

export default nextConfig;

// Makes Cloudflare bindings (Hyperdrive, …) and .dev.vars available via
// getCloudflareContext() during `next dev`. No-op in production builds.
initOpenNextCloudflareForDev();
