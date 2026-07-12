// Types for the Cloudflare bindings declared in wrangler.jsonc.
// Regenerate from wrangler.jsonc with: pnpm cf-typegen:admin
import type { Hyperdrive, Fetcher } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    ASSETS: Fetcher;
    HYPERDRIVE: Hyperdrive;
    BETTER_AUTH_URL: string;
    /** Secret — set via .dev.vars locally, `wrangler secret put` in prod. */
    BETTER_AUTH_SECRET: string;
  }
}

export {};
