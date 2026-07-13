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
};

export default nextConfig;

// Makes Cloudflare bindings (Hyperdrive, R2, …) and .dev.vars available via
// getCloudflareContext() during `next dev`. No-op in production builds.
initOpenNextCloudflareForDev();
