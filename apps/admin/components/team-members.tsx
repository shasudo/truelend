"use client";

import { useState, useTransition } from "react";
import { Ban, Undo2, Trash2 } from "lucide-react";
import { Button, Select, cx } from "@truelend/ui";
import {
  setRoleAction,
  toggleBanAction,
  removeUserAction,
  type ActionResult,
} from "@/lib/team-actions";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  joined: string;
}

export function TeamMembers({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
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
          {members.map((m) => (
            <TeamRow key={m.id} m={m} isSelf={m.id === currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamRow({ m, isSelf }: { m: Member; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const [role, setRole] = useState(m.role);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run(
    action: (fd: FormData) => Promise<ActionResult>,
    fields: Record<string, string>,
    opts: { confirm?: string; success: string },
  ) {
    if (opts.confirm && !window.confirm(opts.confirm)) return;
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    setMsg(null);
    start(async () => {
      const res = await action(fd);
      setMsg(res?.error ? { ok: false, text: res.error } : { ok: true, text: opts.success });
    });
  }

  return (
    <tr className="border-b border-hairline align-top last:border-b-0 hover:bg-paper">
      <td className="px-5 py-3.5 font-semibold text-navy-950">
        {m.name}
        {isSelf && <span className="ml-2 text-xs font-normal text-navy-400">(you)</span>}
      </td>
      <td className="px-5 py-3.5 text-navy-600">{m.email}</td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isSelf || pending}
            className="h-9 w-32 text-sm"
          >
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </Select>
          {!isSelf && role !== m.role && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                run(setRoleAction, { userId: m.id, role }, { success: "Role updated" })
              }
            >
              Save
            </Button>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5 tabular-nums text-navy-500">{m.joined}</td>
      <td className="px-5 py-3.5">
        {isSelf ? (
          <span className="text-xs text-navy-400">—</span>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={m.banned ? "outline" : "ghost"}
                className={m.banned ? "" : "text-red-700 hover:bg-red-50"}
                disabled={pending}
                onClick={() =>
                  run(
                    toggleBanAction,
                    { userId: m.id, currentlyBanned: String(m.banned) },
                    {
                      success: m.banned ? "Unbanned" : "Banned",
                      confirm: m.banned
                        ? undefined
                        : `Ban ${m.name}? They'll be signed out immediately and blocked from logging in.`,
                    },
                  )
                }
              >
                {m.banned ? (
                  <>
                    <Undo2 className="h-4 w-4" aria-hidden /> Unban
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" aria-hidden /> Ban
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-700 hover:bg-red-50"
                disabled={pending}
                onClick={() =>
                  run(
                    removeUserAction,
                    { userId: m.id },
                    {
                      success: "Deleted",
                      confirm: `Permanently delete ${m.name}? This can't be undone. (If they have notes or loan cases on record, ban them instead.)`,
                    },
                  )
                }
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Delete
              </Button>
            </div>
            {pending ? (
              <span className="text-xs text-navy-400">Working…</span>
            ) : (
              msg && (
                <span className={cx("text-xs", msg.ok ? "text-navy-500" : "text-red-600")}>
                  {msg.ok ? "✓ " : ""}
                  {msg.text}
                </span>
              )
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
