import { and, or, eq, ne, gte, lt, lte, ilike, isNull, isNotNull, type SQL } from "drizzle-orm";
import { schema } from "@truelend/db";
import { normalizeIndianMobile } from "@truelend/reference";

/*
 * Row-level read scope and list filters for the three queues staff work.
 *
 * These are pure clause builders with no database access, kept out of the
 * *-queries modules (and so out of `server-only`) for one reason: they ARE the
 * authorization boundary, and the fake drizzle chain implements no leftJoin or
 * offset, so the query functions themselves cannot be exercised in a test.
 * Asserting the clause is the only way to prove the scope reaches SQL.
 *
 * In every builder, `scopeUserId` is null for an admin — no restriction — and
 * the user's own id for an employee.
 */

export type LeadStatus = (typeof schema.leadStatus.enumValues)[number];
export type LeadKind = (typeof schema.leadKind.enumValues)[number];
export type LoanCaseStatus = (typeof schema.loanCaseStatus.enumValues)[number];
export type CallStatus = (typeof schema.callStatus.enumValues)[number];

/** Mirrors channelForKind: partner attribution wins over the website lead kind. */
export const leadChannelValues = ["partner", "website_referral", "website_direct"] as const;
export type LeadChannel = (typeof leadChannelValues)[number];

export interface LeadFilters {
  status?: LeadStatus;
  kind?: LeadKind;
  channel?: LeadChannel;
  product?: string;
  /** user id, or "unassigned" */
  assignee?: string;
  q?: string;
  page: number;
}

export interface LoanCaseFilters {
  status?: LoanCaseStatus;
  lender?: string;
  page: number;
}

export const callbackFilterValues = ["overdue", "today", "scheduled"] as const;
export type CallbackFilter = (typeof callbackFilterValues)[number];

export const callTaskSortValues = ["newest", "oldest", "callback"] as const;
export type CallTaskSort = (typeof callTaskSortValues)[number];

export interface CallTaskFilters {
  status?: CallStatus;
  /** user id, or "unassigned" */
  assignee?: string;
  /** The imported list/campaign name the CSV import writes to `source`. */
  source?: string;
  product?: string;
  callback?: CallbackFilter;
  /** Inclusive `createdAt` bounds as bare YYYY-MM-DD, read as IST days. */
  from?: string;
  to?: string;
  q?: string;
  sort?: CallTaskSort;
  page: number;
}

/*
 * A date input yields a bare YYYY-MM-DD with no zone, and a Worker runs in UTC
 * — so treating it as a UTC instant puts every boundary 5.5 hours out and
 * silently drops the first/last few hours of a day from the range. Same trap
 * already fixed for callbackAt in crm-actions.ts. India has no DST, so adding
 * a flat 24h is a safe way to reach the next day's boundary.
 */
const IST_DAY_MS = 24 * 60 * 60 * 1000;

function istDayStart(date: string): Date | null {
  const parsed = new Date(`${date}T00:00:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The instant a callback lands in "today" for a caller sitting in India. */
function istTodayStart(now: Date): Date {
  const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return new Date(`${istDate}T00:00:00+05:30`);
}

/*
 * Keyed on callback_at rather than status: the status-update action nulls the
 * column whenever the outcome stops being `callback_scheduled`, and the
 * call_tasks_callback_time CHECK enforces the other direction — so a non-null
 * callback_at already means exactly "a callback this caller committed to".
 */
function callbackWhere(filter: CallbackFilter, now: Date): SQL | undefined {
  if (filter === "scheduled") return isNotNull(schema.callTasks.callbackAt);
  if (filter === "overdue") return lte(schema.callTasks.callbackAt, now);
  const start = istTodayStart(now);
  return and(
    gte(schema.callTasks.callbackAt, start),
    lt(schema.callTasks.callbackAt, new Date(start.getTime() + IST_DAY_MS)),
  );
}

function channelWhere(channel: LeadChannel): SQL | undefined {
  if (channel === "partner") return isNotNull(schema.leads.partnerId);
  if (channel === "website_referral")
    return and(isNull(schema.leads.partnerId), eq(schema.leads.kind, "referral"));
  return and(isNull(schema.leads.partnerId), ne(schema.leads.kind, "referral"));
}

export function leadWhere(f: LeadFilters, scopeUserId: string | null): SQL | undefined {
  const clauses: (SQL | undefined)[] = [
    scopeUserId ? eq(schema.leads.assignedTo, scopeUserId) : undefined,
    f.status ? eq(schema.leads.status, f.status) : undefined,
    f.kind ? eq(schema.leads.kind, f.kind) : undefined,
    f.channel ? channelWhere(f.channel) : undefined,
    f.product ? eq(schema.leads.productSlug, f.product) : undefined,
    f.assignee === "unassigned"
      ? isNull(schema.leads.assignedTo)
      : f.assignee
        ? eq(schema.leads.assignedTo, f.assignee)
        : undefined,
    f.q
      ? or(
          ilike(schema.leads.name, `%${f.q}%`),
          ilike(schema.leads.phone, `%${f.q}%`),
          ilike(schema.leads.email, `%${f.q}%`),
        )
      : undefined,
  ];
  return and(...clauses);
}

/*
 * A case has no assignee of its own — ownership is the parent lead's. Scoping
 * therefore filters on leads.assigned_to through the join the query already
 * makes to surface leadName.
 */
export function loanCaseWhere(f: LoanCaseFilters, scopeUserId: string | null): SQL | undefined {
  return and(
    scopeUserId ? eq(schema.leads.assignedTo, scopeUserId) : undefined,
    f.status ? eq(schema.loanCases.status, f.status) : undefined,
    f.lender ? eq(schema.loanCases.lenderSlug, f.lender) : undefined,
  );
}

/**
 * `now` is injected rather than read inside so the callback windows are
 * assertable — a clause built from a moving `new Date()` can't be compared.
 */
export function callTaskWhere(
  f: CallTaskFilters,
  scopeUserId: string | null,
  now: Date = new Date(),
): SQL | undefined {
  // Every stored phone is a clean 10-digit number (both ingestion paths run
  // normalizeIndianMobile before insert), but a phone pasted into search from
  // a phone/WhatsApp contact almost never is — it carries +91, spaces or
  // hyphens. Normalize the query the same way so it still matches.
  const phoneQuery = f.q ? normalizeIndianMobile(f.q) : "";
  const from = f.from ? istDayStart(f.from) : null;
  // Exclusive upper bound on the START of the next day, so the `to` date is
  // itself included rather than truncated at midnight.
  const toStart = f.to ? istDayStart(f.to) : null;
  return and(
    scopeUserId ? eq(schema.callTasks.assignedTo, scopeUserId) : undefined,
    f.status ? eq(schema.callTasks.status, f.status) : undefined,
    f.assignee === "unassigned"
      ? isNull(schema.callTasks.assignedTo)
      : f.assignee
        ? eq(schema.callTasks.assignedTo, f.assignee)
        : undefined,
    f.source ? eq(schema.callTasks.source, f.source) : undefined,
    f.product ? eq(schema.callTasks.productSlug, f.product) : undefined,
    f.callback ? callbackWhere(f.callback, now) : undefined,
    from ? gte(schema.callTasks.createdAt, from) : undefined,
    toStart ? lt(schema.callTasks.createdAt, new Date(toStart.getTime() + IST_DAY_MS)) : undefined,
    f.q
      ? or(
          ilike(schema.callTasks.name, `%${f.q}%`),
          phoneQuery ? ilike(schema.callTasks.phone, `%${phoneQuery}%`) : undefined,
        )
      : undefined,
  );
}

/** Narrows a single-row lookup to the actor's own book. */
export function ownRow(column: Parameters<typeof eq>[0], scopeUserId: string | null) {
  return scopeUserId ? eq(column, scopeUserId) : undefined;
}
