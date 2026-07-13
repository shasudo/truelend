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
