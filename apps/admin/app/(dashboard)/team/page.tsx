import { desc } from "drizzle-orm";
import { Ban, Undo2 } from "lucide-react";
import { Card, Select, SubmitButton } from "@truelend/ui";
import { schema } from "@truelend/db";
import { PageTitle } from "@/components/page-title";
import { CreateUserForm } from "@/components/create-user-form";
import { requireAdmin, getAuthContext } from "@/lib/auth";
import { setRoleAction, toggleBanAction } from "@/lib/team-actions";
import { formatDate } from "@/lib/format";

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
    .orderBy(desc(schema.user.createdAt));

  return (
    <>
      <PageTitle title="Team" subtitle="Employees and access" />

      <Card className="mb-6 p-6">
        <h2 className="mb-5 font-display text-lg font-bold text-navy-950">Add a user</h2>
        <CreateUserForm />
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
              <th className="px-5 py-3 font-semibold">Access</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === session.user.id;
              const banned = u.banned ?? false;
              return (
                <tr key={u.id} className="border-b border-hairline last:border-b-0 hover:bg-paper">
                  <td className="px-5 py-3.5 font-semibold text-navy-950">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 text-xs font-normal text-navy-400">(you)</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-navy-600">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <form action={setRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <Select
                        name="role"
                        defaultValue={u.role ?? "employee"}
                        disabled={isSelf}
                        className="h-9 w-32 text-sm"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </Select>
                      {!isSelf && (
                        <SubmitButton size="sm" variant="ghost">
                          Save
                        </SubmitButton>
                      )}
                    </form>
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-navy-500">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    {isSelf ? (
                      <span className="text-xs text-navy-400">—</span>
                    ) : (
                      <form action={toggleBanAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="currentlyBanned" value={String(banned)} />
                        <SubmitButton
                          size="sm"
                          variant={banned ? "outline" : "ghost"}
                          className={banned ? "" : "text-red-700 hover:bg-red-50"}
                          pendingText={banned ? "Unbanning…" : "Banning…"}
                          confirm={
                            banned
                              ? undefined
                              : `Ban ${u.name}? They'll be signed out immediately and blocked from logging in.`
                          }
                        >
                          {banned ? (
                            <>
                              <Undo2 className="h-4 w-4" aria-hidden /> Unban
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4" aria-hidden /> Ban
                            </>
                          )}
                        </SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
