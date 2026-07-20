import "server-only";
import { and, desc, eq, count, type SQL } from "drizzle-orm";
import { schema, type Database, type LoanCase } from "@truelend/db";

const PAGE_SIZE = 20;

export type LoanCaseStatus = (typeof schema.loanCaseStatus.enumValues)[number];

export interface LoanCaseFilters {
  status?: LoanCaseStatus;
  lender?: string;
  page: number;
}

interface LoanCaseRow extends LoanCase {
  leadName: string | null;
}

function loanCaseWhere(f: LoanCaseFilters): SQL | undefined {
  return and(
    f.status ? eq(schema.loanCases.status, f.status) : undefined,
    f.lender ? eq(schema.loanCases.lenderSlug, f.lender) : undefined,
  );
}

export async function listLoanCases(db: Database, f: LoanCaseFilters) {
  const where = loanCaseWhere(f);

  const totalRows = await db.select({ total: count() }).from(schema.loanCases).where(where);
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

export async function getLoanCase(db: Database, id: string): Promise<LoanCaseRow | null> {
  const rows = await db
    .select({ c: schema.loanCases, leadName: schema.leads.name })
    .from(schema.loanCases)
    .leftJoin(schema.leads, eq(schema.loanCases.leadId, schema.leads.id))
    .where(eq(schema.loanCases.id, id))
    .limit(1);
  const row = rows[0];
  return row ? { ...row.c, leadName: row.leadName } : null;
}
