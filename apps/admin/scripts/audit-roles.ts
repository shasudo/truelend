import { createDb, schema } from "@truelend/db";
import { eq, inArray } from "drizzle-orm";

/*
 * Incident audit for the partner→admin authorization fix. Before requireStaff +
 * the non-staff defaultRole landed, a raw /api/auth/sign-up/email call on the
 * partner app minted role=employee — a staff account. This lists every staff
 * account so you can spot ones you didn't create on the Team page and
 * downgrade/ban them. A staff account that ALSO has a partner profile is a
 * definite compromise.
 *   DATABASE_URL=… pnpm --filter @truelend/admin audit:roles
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const db = createDb(connectionString);
  try {
    const staff = await db
      .select({
        email: schema.user.email,
        name: schema.user.name,
        role: schema.user.role,
        banned: schema.user.banned,
        createdAt: schema.user.createdAt,
        partnerId: schema.partners.userId,
      })
      .from(schema.user)
      .leftJoin(schema.partners, eq(schema.partners.userId, schema.user.id))
      .where(inArray(schema.user.role, ["admin", "employee"]));

    if (staff.length === 0) {
      console.log("No staff (admin|employee) accounts found.");
      return;
    }

    console.log(`${staff.length} staff account(s) — review each against your Team page:\n`);
    let suspect = 0;
    for (const s of staff) {
      const critical = s.partnerId ? "  ⚠ CRITICAL: also has a partner profile" : "";
      if (s.partnerId) suspect++;
      console.log(
        `- ${(s.role ?? "?").padEnd(8)} ${s.email}  (${s.name}, joined ${new Date(s.createdAt)
          .toISOString()
          .slice(0, 10)})${s.banned ? " [banned]" : ""}${critical}`,
      );
    }
    console.log(
      `\n${suspect} account(s) flagged CRITICAL. Downgrade anyone you didn't create on the Team page:`,
    );
    console.log(`  update "user" set role = 'partner_pending' where email = '<email>';`);
    console.log(`Then invalidate their sessions:  delete from session where user_id = '<id>';`);
  } finally {
    await db.$client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
