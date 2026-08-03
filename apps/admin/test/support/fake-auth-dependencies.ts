import { mock } from "node:test";
import { schema } from "@truelend/db";
import { allowSensitiveAuthRequest } from "@truelend/auth/server";
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
  /** Only set by tests exercising the health/ready route. */
  HEALTHCHECK_SECRET?: string;
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

export interface NotifyPartnerDecisionArgs {
  to: string;
  name: string;
  decision: string;
  reason?: string;
  loginUrl: string;
  idempotencyKey?: string;
}

export interface LeadStatusNotificationArgs {
  to: string;
  status: string;
  idempotencyKey?: string;
}

export interface SendEnquiryFormLinkArgs {
  to: string;
  name?: string | null;
  url: string;
  idempotencyKey?: string;
}

type FakeSendResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

interface FakeAuthState {
  env: FakeCloudflareEnv;
  waitUntilCalls: Promise<unknown>[];
  dbOptions: FakeDbOptions;
  createAdminAuthError?: unknown;
  getSession: () => Promise<FakeAdminSession | null>;
  headers: Headers;
  sendPasswordReset: (args: SendResetPasswordArgs) => Promise<{ ok: boolean; skipped?: boolean }>;
  notifyPartnerDecisionCalls: NotifyPartnerDecisionArgs[];
  /** Override to exercise the "saved, but the email failed" notice path. */
  notifyPartnerDecision: () => Promise<FakeSendResult>;
  notifyPartnerPayout: () => Promise<FakeSendResult>;
  sendEnquiryFormLinkCalls: SendEnquiryFormLinkArgs[];
  /** Override to exercise the "we couldn't send the form link" path. */
  sendEnquiryFormLink: () => Promise<FakeSendResult>;
  leadStatusNotificationCalls: LeadStatusNotificationArgs[];
  /** better-auth admin-plugin methods team-actions.ts calls on `auth.api`. */
  createUser: (args: unknown) => Promise<{ user: { id: string } }>;
  requestPasswordReset: (args: unknown) => Promise<void>;
  removeUser: (args: unknown) => Promise<void>;
  setRole: (args: unknown) => Promise<void>;
  banUser: (args: unknown) => Promise<{ user: { banned: boolean } }>;
  unbanUser: (args: unknown) => Promise<{ user: { banned: boolean } }>;
  revokeUserSessions: (args: unknown) => Promise<void>;
  /** better-auth's catch-all request handler, used only by app/api/auth/[...all]/route.ts. */
  authHandler: (req: Request) => Promise<Response>;
  /** When set, @truelend/db's ping() rejects with this instead of resolving — used by the health/ready routes. */
  pingError?: unknown;
  /** When set, pingAuditImmutability() rejects — the audit append-only guard is missing. */
  auditGuardError?: unknown;
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
    notifyPartnerDecisionCalls: [],
    notifyPartnerDecision: async () => ({ ok: true }),
    notifyPartnerPayout: async () => ({ ok: true }),
    sendEnquiryFormLinkCalls: [],
    sendEnquiryFormLink: async () => ({ ok: true }),
    leadStatusNotificationCalls: [],
    createUser: async () => ({ user: { id: "new-user-1" } }),
    requestPasswordReset: async () => undefined,
    removeUser: async () => undefined,
    setRole: async () => undefined,
    banUser: async () => ({ user: { banned: true } }),
    unbanUser: async () => ({ user: { banned: false } }),
    revokeUserSessions: async () => undefined,
    authHandler: async () => Response.json({ ok: true }),
    pingError: undefined,
    auditGuardError: undefined,
  };
}

const state: FakeAuthState = defaultState();

/** Overrides only the fields provided; everything else keeps its current value. */
export function setFakeAuthState(overrides: Partial<FakeAuthState>): void {
  Object.assign(state, overrides);
}

export function getNotifyPartnerDecisionCalls(): readonly NotifyPartnerDecisionArgs[] {
  return state.notifyPartnerDecisionCalls;
}

export function getSendEnquiryFormLinkCalls(): readonly SendEnquiryFormLinkArgs[] {
  return state.sendEnquiryFormLinkCalls;
}

export function getLeadStatusNotificationCalls(): readonly LeadStatusNotificationArgs[] {
  return state.leadStatusNotificationCalls;
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
      ping: async () => {
        if (state.pingError !== undefined) throw state.pingError;
      },
      pingAuditImmutability: async () => {
        if (state.auditGuardError !== undefined) throw state.auditGuardError;
      },
    },
  });
  mock.module("@truelend/auth/server", {
    namedExports: {
      // Real, pure-enough function (a request + a rate-limiter binding) — used
      // as-is rather than faked, same reasoning as re-exporting the real `schema`.
      allowSensitiveAuthRequest,
      createAdminAuth: () => {
        if (state.createAdminAuthError !== undefined) throw state.createAdminAuthError;
        return {
          api: {
            getSession: () => state.getSession(),
            createUser: (args: unknown) => state.createUser(args),
            requestPasswordReset: (args: unknown) => state.requestPasswordReset(args),
            removeUser: (args: unknown) => state.removeUser(args),
            setRole: (args: unknown) => state.setRole(args),
            banUser: (args: unknown) => state.banUser(args),
            unbanUser: (args: unknown) => state.unbanUser(args),
            revokeUserSessions: (args: unknown) => state.revokeUserSessions(args),
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
      notifyPartnerDecision: async (_env: unknown, args: NotifyPartnerDecisionArgs) => {
        state.notifyPartnerDecisionCalls.push(args);
        return state.notifyPartnerDecision();
      },
      notifyPartnerPayout: async () => state.notifyPartnerPayout(),
      sendEnquiryFormLink: async (_env: unknown, args: SendEnquiryFormLinkArgs) => {
        state.sendEnquiryFormLinkCalls.push(args);
        return state.sendEnquiryFormLink();
      },
      notifyLeadStatusChanged: async (_env: unknown, args: LeadStatusNotificationArgs) => {
        state.leadStatusNotificationCalls.push(args);
        return { ok: true as const };
      },
      notifyPartnerLeadStatusChanged: async () => ({ ok: true as const }),
      notifyStaffAccountEvent: async () => ({ ok: true as const }),
      // Status gating is real policy, not a stub: a test that moves a lead to an
      // internal-only stage must see no mail attempted.
      isCustomerNotifiableLeadStatus: (status: string) =>
        ["contacted", "approved", "declined", "disbursed"].includes(status),
      isPartnerNotifiableLeadStatus: (status: string) =>
        ["contacted", "logged_in", "approved", "declined", "disbursed"].includes(status),
    },
  });
}
