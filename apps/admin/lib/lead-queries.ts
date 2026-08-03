import "server-only";
import { and, eq, desc, count, inArray, isNull, or } from "drizzle-orm";
import { schema, type Database, type Lead } from "@truelend/db";
import { leadWhere, ownRow, type LeadFilters } from "./query-filters";

const PAGE_SIZE = 20;

export {
  leadChannelValues,
  type LeadChannel,
  type LeadFilters,
  type LeadKind,
  type LeadStatus,
} from "./query-filters";

interface LeadRow extends Lead {
  assigneeName: string | null;
}

export async function listLeads(db: Database, scopeUserId: string | null, f: LeadFilters) {
  const where = leadWhere(f, scopeUserId);

  const totalPromise = db.select({ total: count() }).from(schema.leads).where(where);
  const totalRows = await totalPromise;
  const total = totalRows[0]?.total ?? 0;

  // Clamp the requested page so paging past the last page can't dead-end on a
  // false "no results" state.
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page), pageCount);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = (await db
    .select({
      lead: schema.leads,
      assigneeName: schema.user.name,
    })
    .from(schema.leads)
    .leftJoin(schema.user, eq(schema.leads.assignedTo, schema.user.id))
    .where(where)
    .orderBy(desc(schema.leads.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset)) as { lead: Lead; assigneeName: string | null }[];

  return {
    rows: rows.map((r): LeadRow => ({ ...r.lead, assigneeName: r.assigneeName })),
    total,
    page,
    pageCount,
  };
}

/*
 * `scopeUserId` narrows the lookup itself rather than checking ownership after
 * the read: an employee guessing another employee's lead id gets no row, so the
 * caller's existing notFound() answers, with no 403 and no existence leak.
 */
export async function getLead(db: Database, scopeUserId: string | null, id: string) {
  const [lead] = await db
    .select()
    .from(schema.leads)
    .where(and(eq(schema.leads.id, id), ownRow(schema.leads.assignedTo, scopeUserId)))
    .limit(1);
  if (!lead) return null;

  const [notes, cases, auditRows, partnerRows] = await Promise.all([
    db
      .select({ note: schema.leadNotes, authorName: schema.user.name })
      .from(schema.leadNotes)
      .leftJoin(schema.user, eq(schema.leadNotes.authorId, schema.user.id))
      .where(eq(schema.leadNotes.leadId, id))
      .orderBy(desc(schema.leadNotes.createdAt)),
    db
      .select()
      .from(schema.loanCases)
      .where(eq(schema.loanCases.leadId, id))
      .orderBy(desc(schema.loanCases.createdAt)),
    // The RP code the lead arrived with. submitLead has always written this, and
    // nothing has ever read it — so "why wasn't this credited?" was unanswerable.
    db
      .select({ after: schema.auditLog.after })
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.entityType, "lead"),
          eq(schema.auditLog.entityId, id),
          eq(schema.auditLog.action, "lead.create"),
        ),
      )
      .limit(1),
    lead.partnerId
      ? db
          .select({ referenceId: schema.partners.referenceId })
          .from(schema.partners)
          .where(eq(schema.partners.userId, lead.partnerId))
          .limit(1)
      : Promise.resolve([] as { referenceId: string }[]),
  ]);

  return {
    lead,
    isPartnerLead: Boolean(lead.partnerId),
    /** RP code that credited this lead, when it is attributed. */
    partnerReferenceId: partnerRows[0]?.referenceId,
    /** RP code the submission carried — present even when it resolved to nobody. */
    attemptedRef: (auditRows[0]?.after as { partnerRef?: string } | null)?.partnerRef,
    notes,
    cases,
  };
}

export async function listEmployees(db: Database) {
  return db
    .select({ id: schema.user.id, name: schema.user.name, role: schema.user.role })
    .from(schema.user)
    .where(
      and(
        inArray(schema.user.role, ["admin", "employee"]),
        or(isNull(schema.user.banned), eq(schema.user.banned, false)),
      ),
    )
    .orderBy(schema.user.name);
}
