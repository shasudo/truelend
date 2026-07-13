import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, type Database } from "@truelend/db";
import { createAuth, type Auth, type CreateAuthOptions, type Session } from "@truelend/auth";
import { sendPasswordReset } from "@truelend/email";

/** better-auth options for this app, incl. the reset-email sender. Shared by
 * getAuthContext (RSC/actions) and the /api/auth/[...all] route handler. */
export function authOptions(env: CloudflareEnv): CreateAuthOptions {
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordReset(env, { to: user.email, name: user.name, url });
    },
  };
}

interface AuthContext {
  db: Database;
  auth: Auth;
  ctx: ExecutionContext;
  env: CloudflareEnv;
}

/*
 * One db + auth per request, shared across layout/pages via React.cache.
 * Server actions and route handlers that OWN a connection close it with
 * ctx.waitUntil(db.$client.end()); RSC reads through this cached context
 * don't — layout and page share the client, so there is no single safe
 * owner.
 * ponytail: RSC reads skip end(); Hyperdrive reclaims idle connections —
 * revisit only if Neon connection counts climb.
 */
export const getAuthContext = cache((): AuthContext => {
  const { env, ctx } = getCloudflareContext();
  const db = createDb(env.HYPERDRIVE.connectionString);
  const auth = createAuth(db, authOptions(env));
  return { db, auth, ctx, env };
});

/*
 * Staff = the two internal roles. This is the load-bearing boundary: partners
 * share these auth tables and can authenticate here (they self-register in the
 * partner app), so "a valid session exists" is NOT staff. A partner session
 * must never reach admin data or mutations — gate on role, not on presence.
 */
const STAFF_ROLES = new Set(["admin", "employee"]);
function isStaff(role: string | null | undefined): boolean {
  return role != null && STAFF_ROLES.has(role);
}

/** Validate the session for real (middleware only checks cookie presence). */
export async function requireSession(): Promise<Session> {
  const { auth } = getAuthContext();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

/**
 * Page/layout guard for all internal staff. Non-staff (partners, or a raw-signup
 * account) are bounced to /login — the login page never auto-forwards, so this
 * is a hard denial, not a loop.
 * ponytail: bounce-to-login leaves the partner's admin-domain session live but
 * useless. Clear it on rejection if the half-signed-in state confuses anyone.
 */
export async function requireStaff(): Promise<Session> {
  const session = await requireSession();
  if (!isStaff(session.user.role)) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/");
  return session;
}

interface MutationContext {
  db: Database;
  ctx: ExecutionContext;
  user: Session["user"] | null;
}

/**
 * For server actions: db + ctx + the current STAFF user (null otherwise).
 * Server actions never run the layout, so this is the boundary for writes —
 * a non-staff session is surfaced as `user: null` so callers deny it exactly
 * like an expired session (`if (!user) redirect("/login")`).
 * The action owns this connection and must close it via ctx.waitUntil.
 */
export async function getMutationContext(): Promise<MutationContext> {
  const { db, auth, ctx } = getAuthContext();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user ?? null;
    return { db, ctx, user: isStaff(user?.role) ? user : null };
  } catch (error) {
    ctx.waitUntil(db.$client.end());
    throw error;
  }
}
