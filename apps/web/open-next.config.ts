import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Defaults are fine for a stateless app. Add an incremental cache / tag cache
// / queue here if you start using ISR or on-demand revalidation.
export default defineCloudflareConfig();
