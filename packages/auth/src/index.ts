import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { schema, type Database } from "@truelend/db";

export interface CreateAuthOptions {
  secret: string;
  baseURL: string;
  /** Bootstrap/seed only — permits email signup. Production leaves this off. */
  allowSignUp?: boolean;
}

/*
 * Per-request factory — workerd forbids reusing I/O objects across requests,
 * so the caller creates a fresh db (createDb) per request and owns closing it.
 * betterAuth() construction itself does no I/O.
 *
 * Roles come from the admin plugin's plain-text `role` column: admin|employee
 * today; partner|referral later are just new strings — no migration.
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
    },
    plugins: [admin({ defaultRole: "employee" })],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
