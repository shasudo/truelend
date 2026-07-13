import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createDb, type Database } from "@truelend/db";
import { createAuth, type Auth, type Session } from "@truelend/auth";

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
  const auth = createAuth(db, {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
  });
  return { db, auth, ctx, env };
});

/** Validate the session for real (middleware only checks cookie presence). */
export async function requireSession(): Promise<Session> {
  const { auth } = getAuthContext();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
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
 * For server actions: db + ctx + the current user (null if unauthenticated).
 * The action owns this connection and must close it via ctx.waitUntil.
 */
export async function getMutationContext(): Promise<MutationContext> {
  const { db, auth, ctx } = getAuthContext();
  const session = await auth.api.getSession({ headers: await headers() });
  return { db, ctx, user: session?.user ?? null };
}
