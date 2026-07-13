import "server-only";
import { desc, eq } from "drizzle-orm";
import { schema, type Database, type Lead } from "@truelend/db";

const num = (v: unknown) => Number(v ?? 0);
type Row = Record<string, unknown>;

export interface PartnerMetrics {
  totalLeads: number;
  approved: number;
  disbursed: number;
  disbursedVolumePaise: number;
  earnedPaise: number;
  paidPaise: number;
}

export async function getPartnerMetrics(db: Database, partnerId: string): Promise<PartnerMetrics> {
  const sql = db.$client;
  const rows = (await sql`
    select
      (select count(*) from leads where partner_id = ${partnerId})::int as total_leads,
      (select count(*) from loan_cases lc join leads le on le.id = lc.lead_id
        where le.partner_id = ${partnerId} and lc.status = 'approved')::int as approved,
      (select count(*) from loan_cases lc join leads le on le.id = lc.lead_id
        where le.partner_id = ${partnerId} and lc.status = 'disbursed')::int as disbursed,
      (select coalesce(sum(lc.disbursed_amount_paise), 0) from loan_cases lc join leads le on le.id = lc.lead_id
        where le.partner_id = ${partnerId} and lc.status = 'disbursed') as volume,
      (select coalesce(sum(amount_paise) filter (where kind = 'earned'), 0)
        from partner_payouts where partner_id = ${partnerId}) as earned,
      (select coalesce(sum(amount_paise) filter (where kind = 'paid'), 0)
        from partner_payouts where partner_id = ${partnerId}) as paid
  `) as Row[];
  const r = rows[0] ?? {};
  return {
    totalLeads: num(r.total_leads),
    approved: num(r.approved),
    disbursed: num(r.disbursed),
    disbursedVolumePaise: num(r.volume),
    earnedPaise: num(r.earned),
    paidPaise: num(r.paid),
  };
}

export async function getPartnerLeads(db: Database, partnerId: string): Promise<Lead[]> {
  return db
    .select()
    .from(schema.leads)
    .where(eq(schema.leads.partnerId, partnerId))
    .orderBy(desc(schema.leads.createdAt))
    .limit(10);
}
