import Link from "next/link";
import type { Metadata } from "next";
import { Search, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button, Card, Input, Select, cx } from "@truelend/ui";
import { callStatusLabels, formatDate, formatDateTime, productName } from "@truelend/reference";
import { schema } from "@truelend/db";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { AssignCallTasksForm, CallTaskImport } from "@/components/crm-forms";
import { getAuthContext, requireStaff, scopeFor } from "@/lib/auth";
import { listCallTasks, type CallStatus, type CallTaskFilters } from "@/lib/crm-queries";
import { listEmployees } from "@/lib/lead-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Call Queue" };

type SP = Record<string, string | string[] | undefined>;

function str(sp: SP, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

function parseFilters(sp: SP): CallTaskFilters {
  const status = str(sp, "status");
  return {
    status: (schema.callStatus.enumValues as readonly string[]).includes(status ?? "")
      ? (status as CallStatus)
      : undefined,
    assignee: str(sp, "assignee"),
    q: str(sp, "q"),
    page: Math.max(1, Number(str(sp, "page")) || 1),
  };
}

function queryString(f: CallTaskFilters, page: number): string {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.assignee) p.set("assignee", f.assignee);
  if (f.q) p.set("q", f.q);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function CallQueuePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const hasFilters = Boolean(filters.status || filters.assignee || filters.q);
  const session = await requireStaff();
  const scopeUserId = scopeFor(session);
  const isAdmin = scopeUserId === null;
  const { db } = getAuthContext();
  const [{ rows, total, page, pageCount }, employees] = await Promise.all([
    listCallTasks(db, scopeUserId, filters),
    listEmployees(db),
  ]);

  const table = (
    <Card className="max-w-full overscroll-x-contain overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
            {isAdmin && <th className="w-10 px-5 py-3 font-semibold" aria-label="Select" />}
            <th className="px-5 py-3 font-semibold">Name</th>
            <th className="px-5 py-3 font-semibold">Phone</th>
            <th className="px-5 py-3 font-semibold">Product</th>
            <th className="px-5 py-3 font-semibold">Outcome</th>
            <th className="px-5 py-3 font-semibold">Assignee</th>
            <th className="px-5 py-3 font-semibold">Callback</th>
            <th className="px-5 py-3 font-semibold">Added</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 8 : 7} className="px-5 py-12 text-center text-muted">
                {hasFilters
                  ? "No call tasks match these filters."
                  : isAdmin
                    ? "No call tasks yet — import a CSV above to start a queue."
                    : "Nothing assigned to you yet."}
              </td>
            </tr>
          )}
          {rows.map((task) => (
            <tr key={task.id} className="border-b border-hairline last:border-b-0 hover:bg-paper">
              {isAdmin && (
                <td className="px-5 py-3.5">
                  <input
                    type="checkbox"
                    name="taskIds"
                    value={task.id}
                    aria-label={`Select ${task.name}`}
                  />
                </td>
              )}
              <td className="px-5 py-3.5">
                <Link
                  href={`/crm/${task.id}`}
                  className="font-semibold text-navy-950 hover:text-red-600"
                >
                  {task.name}
                </Link>
                {task.possibleDuplicate && (
                  <span
                    className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700"
                    title="A lead already exists with this phone number"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> duplicate?
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5 tabular-nums text-navy-700">{task.phone}</td>
              <td className="px-5 py-3.5 text-navy-700">{productName(task.productSlug)}</td>
              <td className="px-5 py-3.5">
                <StatusBadge status={task.status} kind="call" />
              </td>
              <td className="px-5 py-3.5 text-navy-700">{task.assigneeName ?? "—"}</td>
              <td className="px-5 py-3.5 text-xs tabular-nums text-muted">
                {task.callbackAt ? formatDateTime(task.callbackAt) : "—"}
              </td>
              <td className="px-5 py-3.5 text-xs tabular-nums text-muted">
                {formatDate(task.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  return (
    <>
      <PageTitle
        title="Call Queue"
        subtitle={
          isAdmin
            ? `${total} ${total === 1 ? "task" : "tasks"} across the team`
            : `${total} ${total === 1 ? "task" : "tasks"} assigned to you`
        }
      />

      {isAdmin && <CallTaskImport />}

      <Card className="mb-6 p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Name or phone"
              className="pl-9"
              aria-label="Search"
            />
          </div>
          <Select name="status" defaultValue={filters.status ?? ""} aria-label="Outcome">
            <option value="">Any outcome</option>
            {schema.callStatus.enumValues.map((s) => (
              <option key={s} value={s}>
                {callStatusLabels[s]}
              </option>
            ))}
          </Select>
          {/* An employee only sees their own queue, so an assignee filter would
              be a control with one meaningful value. */}
          {isAdmin && (
            <Select name="assignee" defaultValue={filters.assignee ?? ""} aria-label="Assignee">
              <option value="">Any assignee</option>
              <option value="unassigned">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          )}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" size="sm">
              Apply filters
            </Button>
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href="/crm">Clear</Link>
            </Button>
          </div>
        </form>
      </Card>

      {isAdmin ? <AssignCallTasksForm employees={employees}>{table}</AssignCallTasksForm> : table}

      {pageCount > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm text-navy-500">
          <span>
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {/* asChild disabled doesn't inert an anchor — kill pointer + focus explicitly. */}
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cx(page <= 1 && "pointer-events-none opacity-50")}
            >
              <Link
                href={`/crm${queryString(filters, page - 1)}`}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cx(page >= pageCount && "pointer-events-none opacity-50")}
            >
              <Link
                href={`/crm${queryString(filters, page + 1)}`}
                aria-disabled={page >= pageCount}
                tabIndex={page >= pageCount ? -1 : undefined}
              >
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
