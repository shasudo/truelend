import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { schema, type Database } from "@truelend/db";

export interface CreateAuthOptions {
  secret: string;
  baseURL: string;
  /** Bootstrap/seed only — permits email signup. Production leaves this off. */
  allowSignUp?: boolean;
  /**
   * Send the password-reset email. Passed in by the app (which owns the email
   * env) so this package stays decoupled from @truelend/email. Omit to leave
   * reset disabled (e.g. local dev without email configured).
   */
  sendResetPassword?: (data: {
    user: { email: string; name: string };
    url: string;
  }) => Promise<void>;
}

interface EdgeRateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

const EDGE_LIMITED_AUTH_PATHS = new Set([
  "/api/auth/sign-in/email",
  "/api/auth/sign-up/email",
  "/api/auth/request-password-reset",
  "/api/auth/forget-password",
]);

export async function allowSensitiveAuthRequest(
  request: Request,
  limiter: EdgeRateLimiter | undefined,
): Promise<boolean> {
  if (!limiter || !EDGE_LIMITED_AUTH_PATHS.has(new URL(request.url).pathname)) return true;
  let identity = request.headers.get("cf-connecting-ip") ?? "anonymous";
  try {
    const body: unknown = await request.clone().json();
    if (body && typeof body === "object" && "email" in body && typeof body.email === "string") {
      identity = body.email.trim().toLowerCase();
    }
  } catch {
    // Malformed requests still share a bounded fallback key.
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  const key = `${new URL(request.url).pathname}:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  return (await limiter.limit({ key })).success;
}

/*
 * Per-request factory — workerd forbids reusing I/O objects across requests,
 * so the caller creates a fresh db (createDb) per request and owns closing it.
 * betterAuth() construction itself does no I/O.
 *
 * Roles come from the admin plugin's plain-text `role` column: admin|employee
 * (internal staff), business|referral (partners set explicitly at registration).
 * The default below is deliberately a NON-staff role: the partner app has
 * signup enabled, so anyone hitting the raw /api/auth/sign-up/email endpoint
 * (bypassing registerPartner, which sets business|referral) lands on the
 * default — it must never be a staff role, or that path mints admin access.
 */
export function createAuth(db: Database, opts: CreateAuthOptions) {
  return betterAuth({
    secret: opts.secret,
    baseURL: opts.baseURL,
    trustedOrigins: [opts.baseURL],
    advanced: {
      // Cloudflare replaces this header at the edge. Do not trust X-Forwarded-For,
      // which a direct client can spoof and use to evade auth throttles.
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 300, max: 5 },
      },
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Accounts are created by an admin from the Team page, never self-serve.
      disableSignUp: !opts.allowSignUp,
      // Reset is enabled only when the app wires a sender; the link is emailed,
      // never returned to the client. Default 1h token expiry is fine.
      sendResetPassword: opts.sendResetPassword
        ? async ({ user, url }) => {
            await opts.sendResetPassword!({ user: { email: user.email, name: user.name }, url });
          }
        : undefined,
    },
    // nextCookies() MUST be last — it lets signUpEmail/signIn set the session
    // cookie from inside a Next server action (used by partner registration).
    plugins: [admin({ defaultRole: "partner_pending" }), nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
