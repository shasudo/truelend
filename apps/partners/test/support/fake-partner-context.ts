import { mock } from "node:test";

export interface FakeSessionUser {
  id: string;
  email: string;
}

export interface FakeSession {
  user: FakeSessionUser;
}

export interface FakePartnerContext {
  db: unknown;
  session: FakeSession | null;
  partner?: unknown;
  ctx?: unknown;
  env?: unknown;
}

let current: FakePartnerContext = { db: undefined, session: null };

/** Sets the context the next call to a mocked withPartnerMutation/withPartnerRequest callback receives. */
export function setPartnerContext(context: FakePartnerContext): void {
  current = context;
}

export function buildSession(overrides: Partial<FakeSessionUser> = {}): FakeSession {
  return {
    user: {
      id: overrides.id ?? "user-1",
      email: overrides.email ?? "partner@example.com",
    },
  };
}

/**
 * Every apps/partners Server Action and route handler reaches Cloudflare/db/
 * better-auth only through `withPartnerMutation` or `withPartnerRequest` in
 * ../../lib/auth. Mocking that one seam — instead of getCloudflareContext/
 * createDb/createPartnerAuth individually — lets a test hand each one a fully
 * controlled context without touching the real Cloudflare/Postgres/
 * better-auth stack.
 *
 * Call this BEFORE dynamically importing the module under test — e.g.
 * `installPartnerAuthMock(); const mod = await import("../lib/kyc-actions");`
 * A *static* top-level import of the module would evaluate (and bind its real
 * "./auth" import) before this function ever runs. Calling mock.module() as
 * an import-time side effect from a separate file (rather than from an
 * explicit call in the test file itself) has also been observed to crash
 * Node 24.18's test runner with an internal assertion — so this is a
 * function the test file calls, not a side effect of importing this file.
 *
 * mock.module()'s options are still moving: Node 24.18's runtime prefers
 * `options.exports` and warns that `namedExports` is deprecated, but the
 * @types/node version this repo has installed only declares `namedExports`.
 * Using `namedExports` here is the one line to change (to `exports`) once
 * @types/node catches up — every test calling this function is unaffected.
 */
export function installPartnerAuthMock(): void {
  mock.module("../../lib/auth", {
    namedExports: {
      withPartnerMutation: async (run: (context: FakePartnerContext) => unknown) => run(current),
      withPartnerRequest: async (
        _headers: Headers,
        run: (context: FakePartnerContext) => unknown,
      ) => run(current),
    },
  });
}
