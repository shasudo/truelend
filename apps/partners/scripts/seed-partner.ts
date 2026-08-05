import { eq, sql } from "drizzle-orm";
import { createDb, schema } from "@truelend/db";
import { createPartnerAuth } from "@truelend/auth/server";

/*
 * Local/dev test-data helper: creates a Referral Partner account the same way
 * apps/partners/lib/signup-actions.ts's registerPartner does (account +
 * partners row + reference id from the same sequence), without needing the
 * Worker/Turnstile/rate-limiter request context that action requires. Never
 * point this at a non-local database — it exists for exercising the QR/apply
 * flow against local test data, not for production account creation.
 *
 * Passwords are accepted only through BOOTSTRAP_PARTNER_PASSWORD, never argv
 * (which is commonly retained in shell history and process listings).
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const password = process.env.BOOTSTRAP_PARTNER_PASSWORD;
  const [email, name] = process.argv.slice(2);

  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");
  if (!password) throw new Error("BOOTSTRAP_PARTNER_PASSWORD is required");
  if (!email || !name) {
    throw new Error("Usage: seed:partner <email> <name>");
  }

  const db = createDb(connectionString);
  const auth = createPartnerAuth(db, {
    secret,
    baseURL: "http://localhost:3002",
    allowSignUp: true,
  });

  try {
    const [existing] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);
    if (existing) throw new Error("Account already exists. Use a different email.");

    const result = await auth.api.signUpEmail({ body: { name, email, password } });
    const userId = result.user.id;
    console.log(`✓ created user ${email}`);

    const referenceId = await db.transaction(async (tx) => {
      await tx.update(schema.user).set({ role: "referral" }).where(eq(schema.user.id, userId));
      const [partner] = await tx
        .insert(schema.partners)
        .values({
          userId,
          status: "pending",
          referenceId: sql`'RP' || lpad(nextval('partners_reference_seq')::text, 6, '0')`,
          phone: "9876543210",
          dateOfBirth: "1990-01-01",
          city: "Bengaluru",
          referralType: "loan_advisor",
          experienceNote: "Seeded test partner",
        })
        .returning({ referenceId: schema.partners.referenceId });
      await tx.insert(schema.auditLog).values({
        actorId: userId,
        actorEmail: email,
        action: "partner.bootstrap_create",
        entityType: "partner",
        entityId: userId,
        after: { program: "referral", status: "pending" },
      });
      return partner?.referenceId;
    });

    console.log(`✓ ${email} is now a Referral Partner (${referenceId})`);
  } finally {
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
