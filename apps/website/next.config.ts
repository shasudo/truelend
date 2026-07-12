import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source — let Next transpile them.
  transpilePackages: ["@truelend/db", "@truelend/types", "@truelend/ui"],
};

export default nextConfig;

// Makes Cloudflare bindings (Hyperdrive, R2, …) available via
// getCloudflareContext() during `next dev`. No-op in production builds.
initOpenNextCloudflareForDev();
