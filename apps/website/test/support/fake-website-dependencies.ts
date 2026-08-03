import { mock } from "node:test";
import { schema } from "@truelend/db";
import { createFakeDb, type FakeDbOptions } from "@truelend/test-support";

export interface FakeCloudflareEnv {
  HYPERDRIVE: { connectionString: string };
  LEAD_RATE_LIMITER: { limit: (args: { key: string }) => Promise<{ success: boolean }> };
  TURNSTILE_SECRET_KEY?: string;
  /** Only set by tests exercising the health/ready route. */
  HEALTHCHECK_SECRET?: string;
}

interface NotifyNewLeadArgs {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  product?: string | null;
  message?: string | null;
  source: string;
}

interface FakeWebsiteState {
  env: FakeCloudflareEnv;
  waitUntilCalls: Promise<unknown>[];
  dbOptions: FakeDbOptions;
  headers: Headers;
  /** Defaults to true (passes) — set false to exercise the "verification failed" branch. */
  turnstileResult: boolean;
  notifyNewLead: (args: NotifyNewLeadArgs) => Promise<{ ok: boolean; skipped?: boolean }>;
  notifyNewLeadCalls: NotifyNewLeadArgs[];
  /** When set, @truelend/db's ping() rejects with this — used by the health/ready route. */
  pingError?: unknown;
}

function defaultState(): FakeWebsiteState {
  return {
    env: {
      HYPERDRIVE: { connectionString: "postgres://fake" },
      LEAD_RATE_LIMITER: { limit: async () => ({ success: true }) },
      TURNSTILE_SECRET_KEY: "secret",
    },
    waitUntilCalls: [],
    dbOptions: {},
    headers: new Headers(),
    turnstileResult: true,
    notifyNewLead: async () => ({ ok: true, skipped: false }),
    notifyNewLeadCalls: [],
    pingError: undefined,
  };
}

const state: FakeWebsiteState = defaultState();

/** Overrides only the fields provided; everything else keeps its current value. */
export function setFakeWebsiteState(overrides: Partial<FakeWebsiteState>): void {
  Object.assign(state, overrides);
}

/** Restores every field to its default — call this at the start of each test so state never leaks across tests. */
export function resetFakeWebsiteState(): void {
  Object.assign(state, defaultState());
}

export function getWaitUntilCalls(): readonly Promise<unknown>[] {
  return state.waitUntilCalls;
}

export function getNotifyNewLeadCalls(): readonly NotifyNewLeadArgs[] {
  return state.notifyNewLeadCalls;
}

/**
 * Mocks every module-level dependency apps/website's lib/lead-actions.ts and
 * app/api/health/ready/route.ts reach for: Cloudflare env/ctx, the db client,
 * next/headers, Turnstile verification, and the new-lead notification email.
 * Website has no lib/auth.ts wrapper, so this mocks getCloudflareContext
 * directly rather than a per-app auth seam. Call this BEFORE dynamically
 * importing the module under test — see the admin/partners equivalents'
 * doc comments for why (mock.module() must be registered first).
 */
export function installWebsiteDependencyMocks(): void {
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
    },
  });
  mock.module("next/headers", {
    namedExports: {
      headers: async () => state.headers,
    },
  });
  mock.module("@truelend/turnstile/server", {
    namedExports: {
      verifyTurnstile: async () => state.turnstileResult,
    },
  });
  mock.module("@truelend/email", {
    namedExports: {
      notifyNewLead: (_env: unknown, lead: NotifyNewLeadArgs) => {
        state.notifyNewLeadCalls.push(lead);
        return state.notifyNewLead(lead);
      },
      notifyLeadReceived: async () => ({ ok: true as const }),
    },
  });
}
