import { createDb } from "@truelend/db";
import { createAuth } from "@truelend/auth";

/*
 * Bootstrap the first admin. Runs in Node against Neon (not Workers).
 *   DATABASE_URL=… BETTER_AUTH_SECRET=… pnpm --filter @truelend/admin seed:admin <email> <password> [name]
 * Idempotent: if the user already exists, it just (re)promotes them to admin.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const [email, password, name] = process.argv.slice(2);

  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required");
  if (!email || !password) {
    throw new Error("Usage: seed:admin <email> <password> [name]");
  }

  const db = createDb(connectionString);
  const auth = createAuth(db, { secret, baseURL: "http://localhost:3001", allowSignUp: true });

  try {
    try {
      await auth.api.signUpEmail({ body: { email, password, name: name ?? "Admin" } });
      console.log(`✓ created user ${email}`);
    } catch (err) {
      console.log(`• signUp skipped (user likely exists): ${(err as Error).message}`);
    }
    const rows =
      await db.$client`update "user" set role = 'admin' where email = ${email} returning id`;
    if (rows.length === 0) throw new Error(`no user row for ${email} — signup must have failed`);
    console.log(`✓ ${email} is now an admin`);
  } finally {
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
