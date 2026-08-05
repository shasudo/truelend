import Link from "next/link";
import type { Metadata } from "next";
import { Search, ChevronLeft, ChevronRight, AlertTriangle, BarChart3 } from "lucide-react";
import { Button, Card, Input, Select, cx } from "@truelend/ui";
import {
  callStatusLabels,
  formatDate,
  formatDateTime,
  productName,
  products,
} from "@truelend/reference";
import { schema } from "@truelend/db";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { AssignCallTasksForm, BalanceCallQueueForm, CallTaskImport } from "@/components/crm-forms";
import { SelectAllCheckbox } from "@/components/select-all-checkbox";
import { getAuthContext, requireStaff, scopeFor } from "@/lib/auth";
import {
  getCallQueueLoad,
  listCallTaskSources,
  listCallTasks,
  type CallStatus,
  type CallTaskFilters,
} from "@/lib/crm-queries";
import {
  callbackFilterValues,
  callTaskSortValues,
  type CallbackFilter,
  type CallTaskSort,
} from "@/lib/query-filters";
import { listEmployees } from "@/lib/lead-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Call Queue" };

type SP = Record<string, string | string[] | undefined>;

const callbackLabels: Record<CallbackFilter, string> = {
  overdue: "Callback overdue",
  today: "Callback due today",
  scheduled: "Callback scheduled",
};

const sortLabels: Record<CallTaskSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  callback: "Callback soonest",
};

function str(sp: SP, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

/** A bare YYYY-MM-DD; anything else is ignored rather than becoming an Invalid Date. */
function day(sp: SP, key: string): string | undefined {
  const value = str(sp, key);
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

/*
 * `isAdmin` gates `assignee`: for a scoped employee, callTaskWhere ANDs their
 * own assignment with this filter, which is unsatisfiable for any value but
 * their own id. The assignee control is admin-only in the UI below, so an
 * employee can only reach that state via a bare URL param — reading it for
 * them would silently empty their whole queue with no visible cause.
 */
function parseFilters(sp: SP, isAdmin: boolean): CallTaskFilters {
  const status = str(sp, "status");
  return {
    status: (schema.callStatus.enumValues as readonly string[]).includes(status ?? "")
      ? (status as CallStatus)
      : undefined,
    assignee: isAdmin ? str(sp, "assignee") : undefined,
    source: str(sp, "source"),
    product: str(sp, "product"),
    callback: oneOf(str(sp, "callback"), callbackFilterValues),
    from: day(sp, "from"),
    to: day(sp, "to"),
    q: str(sp, "q"),
    sort: oneOf(str(sp, "sort"), callTaskSortValues),
    page: Math.max(1, Number(str(sp, "page")) || 1),
  };
}

function queryString(f: CallTaskFilters, page: number): string {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.assignee) p.set("assignee", f.assignee);
  if (f.source) p.set("source", f.source);
  if (f.product) p.set("product", f.product);
  if (f.callback) p.set("callback", f.callback);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.q) p.set("q", f.q);
  if (f.sort) p.set("sort", f.sort);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function CallQueuePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const session = await requireStaff();
  const scopeUserId = scopeFor(session);
  const isAdmin = scopeUserId === null;
  const filters = parseFilters(sp, isAdmin);
  const hasFilters = Boolean(
    filters.status ||
    filters.assignee ||
    filters.source ||
    filters.product ||
    filters.callback ||
    filters.from ||
    filters.to ||
    filters.q,
  );
  const { db } = getAuthContext();
  const [{ rows, total, page, pageCount }, employees, sources, load] = await Promise.all([
    listCallTasks(db, scopeUserId, filters),
    listEmployees(db),
    listCallTaskSources(db),
    // Only the admin sees the balance controls, so only the admin pays for the
    // workload aggregate.
    isAdmin ? getCallQueueLoad(db) : null,
  ]);

  const table = (
    <Card className="max-w-full overscroll-x-contain overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead>
          <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
            {isAdmin && (
              <th className="w-10 px-5 py-3 font-semibold">
                <SelectAllCheckbox name="taskIds" />
              </th>
            )}
            <th className="px-5 py-3 font-semibold">Name</th>
            <th className="px-5 py-3 font-semibold">Phone</th>
            <th className="px-5 py-3 font-semibold">Product</th>
            <th className="px-5 py-3 font-semibold">Remark</th>
            <th className="px-5 py-3 font-semibold">Outcome</th>
            <th className="px-5 py-3 font-semibold">Assignee</th>
            <th className="px-5 py-3 font-semibold">Callback</th>
            <th className="px-5 py-3 font-semibold">Added</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 9 : 8} className="px-5 py-12 text-center text-muted">
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
                    data-assignee={task.assigneeName ?? ""}
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
                    className="ml-2 inline-flex items-center gap-1 text-xs text-sun-600"
                    title="A lead already exists with this phone number"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> duplicate?
                  </span>
                )}
              </td>
              <td className="px-5 py-3.5 tabular-nums text-navy-700">{task.phone}</td>
              <td className="px-5 py-3.5 text-navy-700">{productName(task.productSlug)}</td>
              {/* Context the caller wants before dialling, not after opening
                  the task. Truncated so one long remark can't blow the row up;
                  the full text is on the detail page and in the title. */}
              <td className="max-w-56 px-5 py-3.5 text-navy-700">
                {task.notes ? (
                  <span className="block truncate" title={task.notes}>
                    {task.notes}
                  </span>
                ) : (
                  "—"
                )}
              </td>
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
        actions={
          isAdmin ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/analytics">
                <BarChart3 className="h-4 w-4" aria-hidden /> Analytics
              </Link>
            </Button>
          ) : undefined
        }
      />

      {isAdmin && <CallTaskImport />}
      {load && (
        <BalanceCallQueueForm
          callers={load.callers}
          totalOpen={load.totalOpen}
          unassignedOpen={load.unassignedOpen}
        />
      )}

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
          {/* The daily working view: who is owed a call back right now. */}
          <Select name="callback" defaultValue={filters.callback ?? ""} aria-label="Callback">
            <option value="">Any callback</option>
            {callbackFilterValues.map((value) => (
              <option key={value} value={value}>
                {callbackLabels[value]}
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
          <Select name="product" defaultValue={filters.product ?? ""} aria-label="Product">
            <option value="">Any product</option>
            {products.map((product) => (
              <option key={product.slug} value={product.slug}>
                {product.name}
              </option>
            ))}
          </Select>
          {/* Absent until an import has actually carried a source, so the
              control never appears as an empty dropdown. */}
          {sources.length > 0 && (
            <Select name="source" defaultValue={filters.source ?? ""} aria-label="Source list">
              <option value="">Any source</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </Select>
          )}
          <Select name="sort" defaultValue={filters.sort ?? ""} aria-label="Sort">
            {callTaskSortValues.map((value) => (
              <option key={value} value={value}>
                {sortLabels[value]}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Input
              type="date"
              name="from"
              defaultValue={filters.from ?? ""}
              aria-label="Added from"
              className="min-w-0"
            />
            <span className="shrink-0 text-sm text-muted">to</span>
            <Input
              type="date"
              name="to"
              defaultValue={filters.to ?? ""}
              aria-label="Added until"
              className="min-w-0"
            />
          </div>
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
