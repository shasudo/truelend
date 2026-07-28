import { mock } from "node:test";
import { schema } from "@truelend/db";
import { createFakeDb, type FakeDbOptions } from "@truelend/test-support";

export interface FakeCloudflareEnv {
  HYPERDRIVE: { connectionString: string };
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  /** Only set by tests exercising a route that reads R2/rate-limiter bindings (e.g. the KYC upload/view routes). */
  BUCKET?: unknown;
  AUTH_RATE_LIMITER?: { limit: (args: { key: string }) => Promise<{ success: boolean }> };
}

export interface FakeAdminSession {
  user: { id: string; email: string; name: string; role: string };
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
  createAdminAuthError?: unknown;
  getSession: () => Promise<FakeAdminSession | null>;
  headers: Headers;
  sendPasswordReset: (args: SendResetPasswordArgs) => Promise<{ ok: boolean; skipped?: boolean }>;
}

function defaultState(): FakeAuthState {
  return {
    env: {
      HYPERDRIVE: { connectionString: "postgres://fake" },
      BETTER_AUTH_SECRET: "secret",
      BETTER_AUTH_URL: "https://admin.example.com",
    },
    waitUntilCalls: [],
    dbOptions: {},
    createAdminAuthError: undefined,
    getSession: async () => null,
    headers: new Headers(),
    sendPasswordReset: async () => ({ ok: true, skipped: false }),
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
 * Mocks every module-level dependency apps/admin/lib/auth.ts reaches for:
 * Cloudflare env/ctx, the db client, the better-auth instance, next/headers,
 * next/navigation's redirect, and the password-reset email send. Call this
 * BEFORE dynamically importing ../lib/auth — a static top-level import would
 * evaluate (and bind the real, unmocked dependency) before this runs, and
 * registering these mocks as a side effect of importing this file (rather
 * than an explicit call) has been observed to crash Node's test runner.
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
    },
  });
  mock.module("@truelend/auth/server", {
    namedExports: {
      createAdminAuth: () => {
        if (state.createAdminAuthError !== undefined) throw state.createAdminAuthError;
        return { api: { getSession: () => state.getSession() } };
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
    },
  });
}
