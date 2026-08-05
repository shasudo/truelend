import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  ne,
  notInArray,
  or,
  sql,
  count,
} from "drizzle-orm";
import { schema, type Database, type CallTask } from "@truelend/db";
import { terminalCallStatusValues } from "@truelend/reference";
import { callTaskWhere, ownRow, type CallTaskFilters, type CallTaskSort } from "./query-filters";

const PAGE_SIZE = 20;

/** Open = still workable. The one definition of it, shared by every count below. */
const stillOpen = notInArray(schema.callTasks.status, [...terminalCallStatusValues]);

export type { CallStatus, CallTaskFilters, CallTaskSort, CallbackFilter } from "./query-filters";

/*
 * `nulls last` matters on the callback sort: most of the queue has no callback
 * at all, and the default (`nulls first` for ASC) would bury every actual
 * commitment under every task that has none.
 */
function orderFor(sort: CallTaskSort | undefined) {
  if (sort === "oldest") return asc(schema.callTasks.createdAt);
  if (sort === "callback") return sql`${schema.callTasks.callbackAt} asc nulls last`;
  return desc(schema.callTasks.createdAt);
}

export interface CallTaskRow extends CallTask {
  assigneeName: string | null;
  /** A lead already exists with this phone. The caller decides what that means. */
  possibleDuplicate: boolean;
}

export async function listCallTasks(db: Database, scopeUserId: string | null, f: CallTaskFilters) {
  const where = callTaskWhere(f, scopeUserId);

  const totalRows = await db.select({ total: count() }).from(schema.callTasks).where(where);
  const total = totalRows[0]?.total ?? 0;

  // Clamp the requested page so paging past the last page can't dead-end on a
  // false "no results" state.
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page), pageCount);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = (await db
    .select({ task: schema.callTasks, assigneeName: schema.user.name })
    .from(schema.callTasks)
    .leftJoin(schema.user, eq(schema.callTasks.assignedTo, schema.user.id))
    .where(where)
    .orderBy(orderFor(f.sort))
    .limit(PAGE_SIZE)
    .offset(offset)) as { task: CallTask; assigneeName: string | null }[];

  // Duplicate detection is computed, never stored: a stored flag is stale the
  // moment another lead lands, and the caller only needs the answer at call
  // time. Bounded to the 20 phones on this page, served by leads_phone_idx.
  const phones = rows.map((r) => r.task.phone);
  const duplicated =
    phones.length === 0
      ? new Set<string>()
      : new Set(
          (
            await db
              .select({ phone: schema.leads.phone })
              .from(schema.leads)
              .where(inArray(schema.leads.phone, phones))
          ).flatMap((r) => (r.phone ? [r.phone] : [])),
        );

  return {
    rows: rows.map((r): CallTaskRow => ({
      ...r.task,
      assigneeName: r.assigneeName,
      possibleDuplicate: duplicated.has(r.task.phone),
    })),
    total,
    page,
    pageCount,
  };
}

/*
 * The campaign/list names imported CSVs carried. Written by the import route
 * since day one and never read anywhere until now. Capped because this is a
 * free-text column — a careless import could otherwise fill a select with
 * thousands of one-off values.
 */
export async function listCallTaskSources(db: Database): Promise<string[]> {
  const rows = await db
    .selectDistinct({ source: schema.callTasks.source })
    .from(schema.callTasks)
    .where(isNotNull(schema.callTasks.source))
    .orderBy(asc(schema.callTasks.source))
    .limit(100);
  return rows.flatMap((row) => (row.source ? [row.source] : []));
}

export interface CallerWorkload {
  id: string;
  name: string;
  /** Tasks still workable — the number the balance action actually evens out. */
  open: number;
}

export interface CallQueueLoad {
  callers: CallerWorkload[];
  totalOpen: number;
  unassignedOpen: number;
}

/*
 * Who is carrying what, right now. The assign controls are the reason this
 * exists: picking an assignee from a bare dropdown is a decision made blind,
 * and "balance across these people" is meaningless without seeing the starting
 * point. Counts open tasks only, matching what balanceCallQueueAction pools.
 */
export async function getCallQueueLoad(db: Database): Promise<CallQueueLoad> {
  const [callers, unassignedRows] = await Promise.all([
    db
      .select({ id: schema.user.id, name: schema.user.name, open: count(schema.callTasks.id) })
      .from(schema.user)
      // Joined rather than filtered so a caller holding nothing still appears —
      // they are exactly who a balance is most likely to be handing work to.
      .leftJoin(schema.callTasks, and(eq(schema.callTasks.assignedTo, schema.user.id), stillOpen))
      .where(
        and(
          inArray(schema.user.role, ["admin", "employee"]),
          or(isNull(schema.user.banned), eq(schema.user.banned, false)),
        ),
      )
      .groupBy(schema.user.id, schema.user.name)
      .orderBy(schema.user.name),
    db
      .select({ total: count() })
      .from(schema.callTasks)
      .where(and(isNull(schema.callTasks.assignedTo), stillOpen)),
  ]);

  const unassignedOpen = unassignedRows[0]?.total ?? 0;
  return {
    callers,
    totalOpen: callers.reduce((sum, caller) => sum + caller.open, 0) + unassignedOpen,
    unassignedOpen,
  };
}

export interface CallTaskHistoryEntry {
  action: string;
  actorEmail: string | null;
  createdAt: Date;
  after: { status?: string; note?: string; leadId?: string; assignedTo?: string | null } | null;
}

/*
 * `scopeUserId` narrows the lookup itself rather than checking ownership after
 * the read: an employee guessing another employee's task id gets no row, so the
 * caller's notFound() answers, with no 403 and no existence leak.
 */
export async function getCallTask(db: Database, scopeUserId: string | null, id: string) {
  const [task] = await db
    .select()
    .from(schema.callTasks)
    .where(and(eq(schema.callTasks.id, id), ownRow(schema.callTasks.assignedTo, scopeUserId)))
    .limit(1);
  if (!task) return null;

  const [duplicateLeads, duplicateTasks, history] = await Promise.all([
    db
      .select({ id: schema.leads.id, status: schema.leads.status })
      .from(schema.leads)
      .where(eq(schema.leads.phone, task.phone))
      .limit(1),
    db
      .select({
        id: schema.callTasks.id,
        status: schema.callTasks.status,
        assigneeName: schema.user.name,
      })
      .from(schema.callTasks)
      .leftJoin(schema.user, eq(schema.callTasks.assignedTo, schema.user.id))
      .where(and(eq(schema.callTasks.phone, task.phone), ne(schema.callTasks.id, task.id)))
      .limit(1),
    // Call outcomes and their notes live in the audit log rather than a notes
    // table; audit_log_entity_idx serves this read.
    db
      .select({
        action: schema.auditLog.action,
        actorEmail: schema.auditLog.actorEmail,
        createdAt: schema.auditLog.createdAt,
        after: schema.auditLog.after,
      })
      .from(schema.auditLog)
      .where(
        and(eq(schema.auditLog.entityType, "call_task"), eq(schema.auditLog.entityId, task.id)),
      )
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(50),
  ]);

  return {
    task,
    /** A lead with this phone already exists — possibly this same person. */
    duplicateLead: duplicateLeads[0],
    /** Another call task shares this phone — who has it, so it can be linked to, not just flagged. */
    duplicateTask: duplicateTasks[0],
    history: history as CallTaskHistoryEntry[],
  };
}
