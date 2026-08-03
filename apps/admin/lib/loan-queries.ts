import "server-only";
import { and, desc, eq, count } from "drizzle-orm";
import { schema, type Database, type LoanCase } from "@truelend/db";
import { loanCaseWhere, ownRow, type LoanCaseFilters } from "./query-filters";

const PAGE_SIZE = 20;

export type { LoanCaseFilters, LoanCaseStatus } from "./query-filters";

interface LoanCaseRow extends LoanCase {
  leadName: string | null;
}

export async function listLoanCases(db: Database, scopeUserId: string | null, f: LoanCaseFilters) {
  const where = loanCaseWhere(f, scopeUserId);

  // The count joins too, so it matches the scoped page. loanCases.leadId is
  // notNull, so the join never drops a row when there is no scope.
  const totalRows = await db
    .select({ total: count() })
    .from(schema.loanCases)
    .leftJoin(schema.leads, eq(schema.loanCases.leadId, schema.leads.id))
    .where(where);
  const total = totalRows[0]?.total ?? 0;

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page), pageCount);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = await db
    .select({ c: schema.loanCases, leadName: schema.leads.name })
    .from(schema.loanCases)
    .leftJoin(schema.leads, eq(schema.loanCases.leadId, schema.leads.id))
    .where(where)
    .orderBy(desc(schema.loanCases.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  return {
    rows: rows.map((r): LoanCaseRow => ({ ...r.c, leadName: r.leadName })),
    total,
    page,
    pageCount,
  };
}

export async function getLoanCase(
  db: Database,
  scopeUserId: string | null,
  id: string,
): Promise<LoanCaseRow | null> {
  const rows = await db
    .select({ c: schema.loanCases, leadName: schema.leads.name })
    .from(schema.loanCases)
    .leftJoin(schema.leads, eq(schema.loanCases.leadId, schema.leads.id))
    .where(and(eq(schema.loanCases.id, id), ownRow(schema.leads.assignedTo, scopeUserId)))
    .limit(1);
  const row = rows[0];
  return row ? { ...row.c, leadName: row.leadName } : null;
}
