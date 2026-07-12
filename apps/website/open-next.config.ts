import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Prerendered pages (including SSG [slug] routes) live in the OpenNext cache
// and are served read-only from static assets — without this, every page
// re-renders on demand and build-time-only code paths (blog fs reads) 500.
// Cache interception serves them without invoking the Next server at all.
// Switch to the R2 incremental cache only if ISR/revalidation is adopted.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
