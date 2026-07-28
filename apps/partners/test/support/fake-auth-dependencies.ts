import { mock } from "node:test";
import { schema } from "@truelend/db";
import { allowSensitiveAuthRequest, isPartnerAuthEndpointAllowed } from "@truelend/auth/server";
import { createFakeDb, type FakeDbOptions } from "@truelend/test-support";

export interface FakeCloudflareEnv {
  HYPERDRIVE: { connectionString: string };
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  /** Only set by tests exercising registration (signup-actions.ts). */
  REGISTRATION_RATE_LIMITER?: { limit: (args: { key: string }) => Promise<{ success: boolean }> };
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  /** Only set by tests exercising the auth catch-all route. */
  AUTH_RATE_LIMITER?: { limit: (args: { key: string }) => Promise<{ success: boolean }> };
  /** Only set by tests exercising the health/ready route. */
  HEALTHCHECK_SECRET?: string;
}

export interface FakePartnerSession {
  user: { id: string; email: string; name: string };
}

/** Mirrors next/navigation's real redirect(): it always throws, never returns. */
export class RedirectSignal extends Error {
  constructor(public readonly target: string) {
    super(`redirect:${target}`);
  }
}

interface SendResetPasswordArgs {
  to: string;
  name: string;
  url: string;
}

interface FakeAuthState {
  env: FakeCloudflareEnv;
  waitUntilCalls: Promise<unknown>[];
  dbOptions: FakeDbOptions;
  createPartnerAuthError?: unknown;
  getSession: () => Promise<FakePartnerSession | null>;
  headers: Headers;
  sendPasswordReset: (args: SendResetPasswordArgs) => Promise<{ ok: boolean; skipped?: boolean }>;
  /** better-auth call signup-actions.ts makes for an anonymous registration. */
  signUpEmail: (args: unknown) => Promise<{ user: { id: string } }>;
  /** Defaults to true (passes) — set false to exercise the "verification failed" branch. */
  turnstileResult: boolean;
  /** better-auth's catch-all request handler, used only by app/api/auth/[...all]/route.ts. */
  authHandler: (req: Request) => Promise<Response>;
  /** When set, @truelend/db's ping()/pingPartnerRegistrationSchema() reject with these — used by the health/ready route. */
  pingError?: unknown;
  pingRegistrationError?: unknown;
}

function defaultState(): FakeAuthState {
  return {
    env: {
      HYPERDRIVE: { connectionString: "postgres://fake" },
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "https://partners.example.com",
    },
    waitUntilCalls: [],
    dbOptions: {},
    createPartnerAuthError: undefined,
    getSession: async () => null,
    headers: new Headers(),
    sendPasswordReset: async () => ({ ok: true, skipped: false }),
    signUpEmail: async () => ({ user: { id: "new-user-1" } }),
    turnstileResult: true,
    authHandler: async () => Response.json({ ok: true }),
    pingError: undefined,
    pingRegistrationError: undefined,
  };
}

const state: FakeAuthState = defaultState();

/** Overrides only the fields provided; everything else keeps its current value. */
export function setFakeAuthState(overrides: Partial<FakeAuthState>): void {
  Object.assign(state, overrides);
}

/** Restores every field to its default — call this at the start of each test so state never leaks across tests. */
export function resetFakeAuthState(): void {
  Object.assign(state, defaultState());
}

export function getWaitUntilCalls(): readonly Promise<unknown>[] {
  return state.waitUntilCalls;
}

/**
 * Mocks every module-level dependency apps/partners/lib/auth.ts reaches for:
 * Cloudflare env/ctx, the db client, the better-auth instance, next/headers,
 * next/navigation's redirect, and the password-reset email send. Call this
 * BEFORE dynamically importing ../lib/auth (see fake-partner-context.ts's
 * doc comment for why — same reasoning applies here).
 */
export function installAuthDependencyMocks(): void {
  mock.module("@opennextjs/cloudflare", {
    namedExports: {
      getCloudflareContext: () => ({
        env: state.env,
        ctx: { waitUntil: (promise: Promise<unknown>) => state.waitUntilCalls.push(promise) },
      }),
    },
  });
  mock.module("@truelend/db", {
    namedExports: {
      schema,
      createDb: () => createFakeDb(state.dbOptions),
      ping: async () => {
        if (state.pingError !== undefined) throw state.pingError;
      },
      pingPartnerRegistrationSchema: async () => {
        if (state.pingRegistrationError !== undefined) throw state.pingRegistrationError;
      },
    },
  });
  mock.module("@truelend/auth/server", {
    namedExports: {
      // Real, pure-enough functions (a Request + optionally a rate-limiter
      // binding) — used as-is rather than faked, same reasoning as re-exporting
      // the real `schema`.
      allowSensitiveAuthRequest,
      isPartnerAuthEndpointAllowed,
      createPartnerAuth: () => {
        if (state.createPartnerAuthError !== undefined) throw state.createPartnerAuthError;
        return {
          api: {
            getSession: () => state.getSession(),
            signUpEmail: (args: unknown) => state.signUpEmail(args),
          },
          handler: (req: Request) => state.authHandler(req),
        };
      },
    },
  });
  mock.module("next/headers", {
    namedExports: {
      headers: async () => state.headers,
    },
  });
  mock.module("next/navigation", {
    namedExports: {
      redirect: (target: string) => {
        throw new RedirectSignal(target);
      },
    },
  });
  mock.module("@truelend/email", {
    namedExports: {
      sendPasswordReset: (_env: unknown, args: SendResetPasswordArgs) =>
        state.sendPasswordReset(args),
      notifyPartnerRegistration: async () => ({ ok: true as const, skipped: false }),
    },
  });
  mock.module("@truelend/turnstile/server", {
    namedExports: {
      verifyTurnstile: async () => state.turnstileResult,
    },
  });
}
