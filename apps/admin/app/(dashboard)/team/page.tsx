import { desc, inArray } from "drizzle-orm";
import { Card } from "@truelend/ui";
import { schema } from "@truelend/db";
import { PageTitle } from "@/components/page-title";
import { CreateUserForm } from "@/components/create-user-form";
import { TeamMembers } from "@/components/team-members";
import { requireAdmin, getAuthContext } from "@/lib/auth";
import { formatDate } from "@truelend/reference";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await requireAdmin();
  const { db } = getAuthContext();
  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.user.role,
      banned: schema.user.banned,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .where(inArray(schema.user.role, ["admin", "employee"]))
    .orderBy(desc(schema.user.createdAt));

  const members = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? "employee",
    banned: u.banned ?? false,
    joined: formatDate(u.createdAt),
  }));

  return (
    <>
      <PageTitle title="Team" subtitle="Employees and access" />

      <Card className="mb-6 p-5 sm:p-6">
        <h2 className="mb-5 font-display text-lg font-bold text-navy-950">Add a user</h2>
        <CreateUserForm />
      </Card>

      <Card>
        <TeamMembers members={members} currentUserId={session.user.id} />
      </Card>
    </>
  );
}
export const metadata = { title: "Team" };
