// Secret bindings are not emitted by Wrangler type generation. Keep only their
// type augmentation here; cloudflare-env.d.ts is generated from wrangler.jsonc.
import "@cloudflare/workers-types";

declare global {
  namespace Cloudflare {
    interface Env {
      BETTER_AUTH_SECRET: string;
      /** Protects /api/health/ready. */
      HEALTHCHECK_SECRET?: string;
      /** Optional locally; production preflight requires it. */
      RESEND_API_KEY?: string;
    }
  }
}

export {};
