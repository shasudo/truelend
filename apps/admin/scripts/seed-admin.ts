import { eq } from "drizzle-orm";
import { createDb, schema } from "@truelend/db";
import { createAdminAuth } from "@truelend/auth";

/*
 * Break-glass bootstrap for the first admin. Runs in Node against a direct
 * development/staging database URL, never through a Worker.
 *
 * Passwords are accepted only through BOOTSTRAP_ADMIN_PASSWORD, never argv
 * (which is commonly retained in shell history and process listings).
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const args = process.argv.slice(2);
  const promoteExisting = args.includes("--promote-existing");
  const [email, name] = args.filter((arg) => arg !== "--promote-existing");

  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");
  if (!password) throw new Error("BOOTSTRAP_ADMIN_PASSWORD is required");
  if (!email || !password) {
    throw new Error("Usage: seed:admin <email> [name] [--promote-existing]");
  }

  const db = createDb(connectionString);
  const auth = createAdminAuth(db, {
    secret,
    baseURL: "http://localhost:3001",
    allowSignUp: true,
  });

  try {
    const [existing] = await db
      .select({ id: schema.user.id, role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);

    if (existing && !promoteExisting) {
      throw new Error(
        "Account already exists. Refusing promotion by default; audit it first, then rerun with --promote-existing.",
      );
    }

    let userId = existing?.id;
    if (existing) {
      const [partner] = await db
        .select({ userId: schema.partners.userId })
        .from(schema.partners)
        .where(eq(schema.partners.userId, existing.id))
        .limit(1);
      if (partner) throw new Error("Refusing to promote a partner-linked identity to staff.");
    } else {
      const result = await auth.api.signUpEmail({
        body: { email, password, name: name ?? "Admin" },
      });
      userId = result.user.id;
      console.log(`✓ created user ${email}`);
    }

    if (!userId) throw new Error("Admin bootstrap did not produce a user id.");
    await db.transaction(async (tx) => {
      await tx.delete(schema.session).where(eq(schema.session.userId, userId));
      await tx.update(schema.user).set({ role: "admin" }).where(eq(schema.user.id, userId));
      await tx.insert(schema.auditLog).values({
        actorId: userId,
        actorEmail: email,
        action: existing ? "team.bootstrap_promote" : "team.bootstrap_create",
        entityType: "user",
        entityId: userId,
        before: existing ? { role: existing.role } : undefined,
        after: { role: "admin", sessionsRevoked: true },
      });
    });
    console.log(`✓ ${email} is now an admin`);
  } finally {
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
