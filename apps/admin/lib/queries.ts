import "server-only";
import { and, or, eq, ilike, isNull, desc, count, type SQL } from "drizzle-orm";
import { schema, type Database, type Lead } from "@truelend/db";

export const PAGE_SIZE = 20;

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

export interface LeadRow extends Lead {
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
  const offset = (f.page - 1) * PAGE_SIZE;

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

  const totalRows = await db.select({ total: count() }).from(schema.leads).where(where);
  const total = totalRows[0]?.total ?? 0;

  return {
    rows: rows.map((r): LeadRow => ({ ...r.lead, assigneeName: r.assigneeName })),
    total,
    page: f.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getLead(db: Database, id: string) {
  const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
  if (!lead) return null;

  const notes = await db
    .select({ note: schema.leadNotes, authorName: schema.user.name })
    .from(schema.leadNotes)
    .leftJoin(schema.user, eq(schema.leadNotes.authorId, schema.user.id))
    .where(eq(schema.leadNotes.leadId, id))
    .orderBy(desc(schema.leadNotes.createdAt));

  const cases = await db
    .select()
    .from(schema.loanCases)
    .where(eq(schema.loanCases.leadId, id))
    .orderBy(desc(schema.loanCases.createdAt));

  const assignee = lead.assignedTo
    ? (((await db
        .select({ name: schema.user.name })
        .from(schema.user)
        .where(eq(schema.user.id, lead.assignedTo))
        .limit(1)) ?? [])[0]?.name ?? null)
    : null;

  return { lead, notes, cases, assignee };
}

export async function listEmployees(db: Database) {
  return db
    .select({ id: schema.user.id, name: schema.user.name, role: schema.user.role })
    .from(schema.user)
    .orderBy(schema.user.name);
}
