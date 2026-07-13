// Types for the Cloudflare bindings declared in wrangler.jsonc.
// getCloudflareContext().env is typed as the global CloudflareEnv interface.
// Regenerate from wrangler.jsonc with: pnpm cf-typegen
import type { Hyperdrive, Fetcher, RateLimit } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    ASSETS: Fetcher;
    HYPERDRIVE: Hyperdrive;
    LEAD_RATE_LIMITER: RateLimit;
    /** Optional — set via .dev.vars locally, `wrangler secret put` in prod. */
    TURNSTILE_SECRET_KEY?: string;
    /** Protects /api/health/ready; set as a Worker secret. */
    HEALTHCHECK_SECRET?: string;
    // Email (Resend) — see @truelend/email. Missing key = no-op.
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    TEAM_EMAIL?: string;
  }
}

export {};
