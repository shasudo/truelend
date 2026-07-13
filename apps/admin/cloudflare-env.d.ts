// Types for the Cloudflare bindings declared in wrangler.jsonc.
// Regenerate from wrangler.jsonc with: pnpm cf-typegen:admin
import type { Hyperdrive, Fetcher, R2Bucket, RateLimit } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    ASSETS: Fetcher;
    HYPERDRIVE: Hyperdrive;
    BUCKET: R2Bucket;
    AUTH_RATE_LIMITER: RateLimit;
    BETTER_AUTH_URL: string;
    /** Secret — set via .dev.vars locally, `wrangler secret put` in prod. */
    BETTER_AUTH_SECRET: string;
    /** Protects /api/health/ready; set as a Worker secret. */
    HEALTHCHECK_SECRET?: string;
    // Email (Resend) — see @truelend/email. Missing key = no-op.
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    TEAM_EMAIL?: string;
    PARTNERS_URL?: string;
  }
}

export {};
