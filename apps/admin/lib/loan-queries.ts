import "server-only";
import { desc, eq } from "drizzle-orm";
import { schema, type Database, type LoanCase } from "@truelend/db";

export interface LoanCaseRow extends LoanCase {
  leadName: string | null;
}

export async function listLoanCases(db: Database): Promise<LoanCaseRow[]> {
  const rows = await db
    .select({ c: schema.loanCases, leadName: schema.leads.name })
    .from(schema.loanCases)
    .leftJoin(schema.leads, eq(schema.loanCases.leadId, schema.leads.id))
    .orderBy(desc(schema.loanCases.createdAt));
  return rows.map((r) => ({ ...r.c, leadName: r.leadName }));
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
