import { and, or, eq, ne, ilike, isNull, isNotNull, type SQL } from "drizzle-orm";
import { schema } from "@truelend/db";

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

export interface CallTaskFilters {
  status?: CallStatus;
  /** user id, or "unassigned" */
  assignee?: string;
  q?: string;
  page: number;
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

export function callTaskWhere(f: CallTaskFilters, scopeUserId: string | null): SQL | undefined {
  return and(
    scopeUserId ? eq(schema.callTasks.assignedTo, scopeUserId) : undefined,
    f.status ? eq(schema.callTasks.status, f.status) : undefined,
    f.assignee === "unassigned"
      ? isNull(schema.callTasks.assignedTo)
      : f.assignee
        ? eq(schema.callTasks.assignedTo, f.assignee)
        : undefined,
    f.q
      ? or(ilike(schema.callTasks.name, `%${f.q}%`), ilike(schema.callTasks.phone, `%${f.q}%`))
      : undefined,
  );
}

/** Narrows a single-row lookup to the actor's own book. */
export function ownRow(column: Parameters<typeof eq>[0], scopeUserId: string | null) {
  return scopeUserId ? eq(column, scopeUserId) : undefined;
}
