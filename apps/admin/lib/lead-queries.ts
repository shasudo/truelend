import "server-only";
import { and, or, eq, ilike, isNull, desc, count, inArray, type SQL } from "drizzle-orm";
import { schema, type Database, type Lead } from "@truelend/db";

const PAGE_SIZE = 20;

export type LeadStatus = (typeof schema.leadStatus.enumValues)[number];
export type LeadKind = (typeof schema.leadKind.enumValues)[number];

export interface LeadFilters {
  status?: LeadStatus;
  kind?: LeadKind;
  product?: string;
  /** user id, or "unassigned" */
  assignee?: string;
  q?: string;
  page: number;
}

interface LeadRow extends Lead {
  assigneeName: string | null;
}

function leadWhere(f: LeadFilters): SQL | undefined {
  const clauses: (SQL | undefined)[] = [
    f.status ? eq(schema.leads.status, f.status) : undefined,
    f.kind ? eq(schema.leads.kind, f.kind) : undefined,
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

export async function listLeads(db: Database, f: LeadFilters) {
  const where = leadWhere(f);

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

export async function getLead(db: Database, id: string) {
  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
  if (!lead) return null;

  const [notes, cases] = await Promise.all([
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
  ]);

  return { lead, isPartnerLead: Boolean(lead.partnerId), notes, cases };
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
