import "server-only";
import { count, desc, eq } from "drizzle-orm";
import {
  schema,
  type BankApplyLead,
  type Database,
  type Lead,
  type PartnerPayout,
} from "@truelend/db";

const num = (v: unknown) => Number(v ?? 0);
type Row = Record<string, unknown>;

interface PartnerMetrics {
  totalLeads: number;
  activeLeads: number;
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
      (select count(*) from leads where partner_id = ${partnerId}
        and status not in ('declined', 'disbursed', 'lost'))::int as active_leads,
      (select count(distinct le.id) from loan_cases lc join leads le on le.id = lc.lead_id
        where le.partner_id = ${partnerId} and lc.status = 'approved')::int as approved,
      (select count(distinct le.id) from loan_cases lc join leads le on le.id = lc.lead_id
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
    activeLeads: num(r.active_leads),
    approved: num(r.approved),
    disbursed: num(r.disbursed),
    disbursedVolumePaise: num(r.volume),
    earnedPaise: num(r.earned),
    paidPaise: num(r.paid),
  };
}

export interface PipelineStage {
  status: string;
  count: number;
}

/** Lead counts grouped by status, for the dashboard pipeline breakdown. */
export async function getPartnerPipeline(
  db: Database,
  partnerId: string,
): Promise<PipelineStage[]> {
  const rows = (await db.$client`
    select status, count(*)::int as count
    from leads
    where partner_id = ${partnerId}
    group by status
  `) as Row[];
  return rows.map((row) => ({ status: String(row.status), count: num(row.count) }));
}

interface PaginatedLeads {
  rows: Lead[];
  total: number;
  page: number;
  pageCount: number;
}

export async function getPartnerLeadsPage(
  db: Database,
  partnerId: string,
  requestedPage: number,
): Promise<PaginatedLeads> {
  const pageSize = 20;
  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.leads)
    .where(eq(schema.leads.partnerId, partnerId));
  const total = totalRow?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const rows = await db
    .select()
    .from(schema.leads)
    .where(eq(schema.leads.partnerId, partnerId))
    .orderBy(desc(schema.leads.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { rows, total, page, pageCount };
}

export async function getPartnerPayouts(db: Database, partnerId: string): Promise<PartnerPayout[]> {
  return db
    .select()
    .from(schema.partnerPayouts)
    .where(eq(schema.partnerPayouts.partnerId, partnerId))
    .orderBy(desc(schema.partnerPayouts.createdAt))
    .limit(50);
}

export async function getPartnerLeads(db: Database, partnerId: string): Promise<Lead[]> {
  return db
    .select()
    .from(schema.leads)
    .where(eq(schema.leads.partnerId, partnerId))
    .orderBy(desc(schema.leads.createdAt))
    .limit(10);
}

interface PaginatedBankApplyLeads {
  rows: BankApplyLead[];
  total: number;
  page: number;
  pageCount: number;
}

/** This partner's own QR quick-apply referrals — scoped by partnerId, like every query above. */
export async function getPartnerBankLeads(
  db: Database,
  partnerId: string,
  requestedPage: number,
): Promise<PaginatedBankApplyLeads> {
  const pageSize = 20;
  const [totalRow] = await db
    .select({ total: count() })
    .from(schema.bankApplyLeads)
    .where(eq(schema.bankApplyLeads.partnerId, partnerId));
  const total = totalRow?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const rows = await db
    .select()
    .from(schema.bankApplyLeads)
    .where(eq(schema.bankApplyLeads.partnerId, partnerId))
    .orderBy(desc(schema.bankApplyLeads.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { rows, total, page, pageCount };
}
