import "server-only";
import type { Database } from "@truelend/db";
import { channelForKind, normalizeSafeInteger, products } from "@truelend/reference";

// These aggregates are gnarly (FILTER clauses, date_trunc, cross-table joins),
// so they use the raw postgres.js client (db.$client) rather than the query
// builder. Counts are cast ::int; paise sums arrive as numeric strings and are
// rejected if an aggregate exceeds JavaScript's safe integer range.

type Row = Record<string, unknown>;
const num = (value: unknown) => normalizeSafeInteger(value, "MIS aggregate");

interface OverviewStats {
  totalLeads: number;
  inPipeline: number;
  disbursedCases: number;
  disbursedVolumePaise: number;
  netPaise: number;
}

export async function getOverviewStats(db: Database): Promise<OverviewStats> {
  const sql = db.$client;
  const rows = (await sql`
    select
      (select count(*) from leads)::int as total_leads,
      (select count(*) from leads
        where status in ('contacted','qualified','docs_collected','logged_in','approved'))::int as in_pipeline,
      (select count(*) from loan_cases where status='disbursed')::int as disbursed_cases,
      (select coalesce(sum(disbursed_amount_paise),0) from loan_cases where status='disbursed') as disbursed_volume_paise,
      (select coalesce(sum(revenue_paise),0) - coalesce(sum(payout_paise),0) from loan_cases) as net_paise
  `) as Row[];
  const r = rows[0] ?? {};
  return {
    totalLeads: num(r.total_leads),
    inPipeline: num(r.in_pipeline),
    disbursedCases: num(r.disbursed_cases),
    disbursedVolumePaise: num(r.disbursed_volume_paise),
    netPaise: num(r.net_paise),
  };
}

export interface EmployeeOverviewStats {
  myLeads: number;
  myOpenLeads: number;
  myCallTasks: number;
  myCallbacksDue: number;
  myConversions: number;
}

/*
 * An employee's own numbers. A separate query rather than a scoped variant of
 * getOverviewStats because AGENTS.md bans conditional empty postgres.js
 * fragments, and because an employee has no business seeing revenue: the
 * company P&L tiles are simply absent here rather than zeroed.
 */
export async function getEmployeeOverviewStats(
  db: Database,
  userId: string,
): Promise<EmployeeOverviewStats> {
  const rows = (await db.$client`
    select
      (select count(*) from leads where assigned_to = ${userId})::int as my_leads,
      (select count(*) from leads
        where assigned_to = ${userId}
          and status in ('new','contacted','qualified','docs_collected','logged_in','approved'))::int
        as my_open_leads,
      (select count(*) from call_tasks
        where assigned_to = ${userId} and status not in ('converted','not_interested','wrong_number'))::int
        as my_call_tasks,
      (select count(*) from call_tasks
        where assigned_to = ${userId} and status = 'callback_scheduled' and callback_at <= now())::int
        as my_callbacks_due,
      (select count(*) from call_tasks
        where assigned_to = ${userId} and status = 'converted')::int as my_conversions
  `) as Row[];
  const r = rows[0] ?? {};
  return {
    myLeads: num(r.my_leads),
    myOpenLeads: num(r.my_open_leads),
    myCallTasks: num(r.my_call_tasks),
    myCallbacksDue: num(r.my_callbacks_due),
    myConversions: num(r.my_conversions),
  };
}

export interface TimePoint {
  day: string;
  count: number;
}

export async function getLeadsOverTime(db: Database): Promise<TimePoint[]> {
  const rows = (await db.$client`
    select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, count(*)::int as n
    from leads
    where created_at > now() - interval '30 days'
    group by 1 order by 1
  `) as Row[];
  return rows.map((r) => ({ day: String(r.day), count: num(r.n) }));
}

export interface NamedCount {
  name: string;
  count: number;
}

export async function getLeadsByProduct(db: Database): Promise<NamedCount[]> {
  const rows = (await db.$client`
    select product_slug, count(*)::int as n
    from leads where product_slug is not null
    group by 1 order by n desc
  `) as Row[];
  return rows.map((r) => ({
    name: products.find((p) => p.slug === r.product_slug)?.shortName ?? String(r.product_slug),
    count: num(r.n),
  }));
}

export async function getLeadsByChannel(db: Database): Promise<NamedCount[]> {
  const rows = (await db.$client`
    select le.kind, (le.partner_id is not null) as is_partner_lead, count(*)::int as n
    from leads le
    group by le.kind, (le.partner_id is not null)
  `) as Row[];
  const counts = new Map<string, number>();
  for (const row of rows) {
    const channel = channelForKind(String(row.kind), row.is_partner_lead === true);
    counts.set(channel, (counts.get(channel) ?? 0) + num(row.n));
  }
  return [...counts].map(([name, count]) => ({ name, count }));
}

export interface MisRow {
  key: string;
  label: string;
  leads: number;
  cases: number;
  approved: number;
  declined: number;
  disbursed: number;
  disbursedVolumePaise: number;
  revenuePaise: number;
  payoutPaise: number;
  netPaise: number;
}

// Channel is derived in SQL (below, inlined so it can be a GROUP BY key):
// Referral-partner attribution wins over website kind.
const CHANNEL_ORDER = ["Website · Direct", "Website · Referral", "Referral Partner"];

export async function getMisByProduct(db: Database): Promise<MisRow[]> {
  const sql = db.$client;
  const leadRows = (await sql`
    select product_slug as k, count(*)::int as n from leads
    where product_slug is not null group by 1
  `) as Row[];
  const caseRows = (await sql`
    select product_slug as k,
      count(*)::int as cases,
      count(*) filter (where status='approved')::int as approved,
      count(*) filter (where status='declined')::int as declined,
      count(*) filter (where status='disbursed')::int as disbursed,
      coalesce(sum(disbursed_amount_paise) filter (where status='disbursed'),0) as volume,
      coalesce(sum(revenue_paise),0) as revenue,
      coalesce(sum(payout_paise),0) as payout
    from loan_cases group by 1
  `) as Row[];

  const leadsByKey = new Map(leadRows.map((r) => [String(r.k), num(r.n)]));
  const casesByKey = new Map(caseRows.map((r) => [String(r.k), r]));

  return products
    .map((p): MisRow => {
      const c = casesByKey.get(p.slug) ?? {};
      const revenue = num(c.revenue);
      const payout = num(c.payout);
      return {
        key: p.slug,
        label: p.name,
        leads: leadsByKey.get(p.slug) ?? 0,
        cases: num(c.cases),
        approved: num(c.approved),
        declined: num(c.declined),
        disbursed: num(c.disbursed),
        disbursedVolumePaise: num(c.volume),
        revenuePaise: revenue,
        payoutPaise: payout,
        netPaise: revenue - payout,
      };
    })
    .filter((r) => r.leads > 0 || r.cases > 0);
}

export async function getMisByChannel(db: Database): Promise<MisRow[]> {
  const sql = db.$client;
  const leadRows = (await sql`
    select
      case
        when le.partner_id is not null then 'Referral Partner'
        when le.kind = 'referral' then 'Website · Referral'
        else 'Website · Direct'
      end as channel,
      count(*)::int as n
    from leads le
    group by 1
  `) as Row[];
  const caseRows = (await sql`
    select
      case
        when le.partner_id is not null then 'Referral Partner'
        when le.kind = 'referral' then 'Website · Referral'
        else 'Website · Direct'
      end as channel,
      count(lc.*)::int as cases,
      count(lc.*) filter (where lc.status='approved')::int as approved,
      count(lc.*) filter (where lc.status='declined')::int as declined,
      count(lc.*) filter (where lc.status='disbursed')::int as disbursed,
      coalesce(sum(lc.disbursed_amount_paise) filter (where lc.status='disbursed'),0) as volume,
      coalesce(sum(lc.revenue_paise),0) as revenue,
      coalesce(sum(lc.payout_paise),0) as payout
    from loan_cases lc
      join leads le on le.id = lc.lead_id
    group by 1
  `) as Row[];

  const leadsByCh = new Map(leadRows.map((r) => [String(r.channel), num(r.n)]));
  const casesByCh = new Map(caseRows.map((r) => [String(r.channel), r]));

  return CHANNEL_ORDER.map((label): MisRow => {
    const c = casesByCh.get(label) ?? {};
    const revenue = num(c.revenue);
    const payout = num(c.payout);
    return {
      key: label,
      label,
      leads: leadsByCh.get(label) ?? 0,
      cases: num(c.cases),
      approved: num(c.approved),
      declined: num(c.declined),
      disbursed: num(c.disbursed),
      disbursedVolumePaise: num(c.volume),
      revenuePaise: revenue,
      payoutPaise: payout,
      netPaise: revenue - payout,
    };
  }).filter((r) => r.leads > 0 || r.cases > 0);
}

interface PartnerMisRow {
  key: string;
  label: string;
  leads: number;
  disbursed: number;
  disbursedVolumePaise: number;
  earnedPaise: number;
  paidPaise: number;
  balancePaise: number;
}

// Per-referral-partner summary (only partners who've sourced a lead).
export async function getMisByPartner(db: Database): Promise<PartnerMisRow[]> {
  const rows = (await db.$client`
    select p.user_id as key, u.name as label,
      (select count(*)::int from leads where partner_id = p.user_id) as leads,
      (select count(*)::int from loan_cases lc join leads le on le.id = lc.lead_id
        where le.partner_id = p.user_id and lc.status = 'disbursed') as disbursed,
      (select coalesce(sum(lc.disbursed_amount_paise), 0) from loan_cases lc join leads le on le.id = lc.lead_id
        where le.partner_id = p.user_id and lc.status = 'disbursed') as volume,
      (select coalesce(sum(amount_paise) filter (where kind='earned'), 0)
        from partner_payouts where partner_id = p.user_id) as earned,
      (select coalesce(sum(amount_paise) filter (where kind='paid'), 0)
        from partner_payouts where partner_id = p.user_id) as paid
    from partners p join "user" u on u.id = p.user_id
    where exists (select 1 from leads where partner_id = p.user_id)
    order by leads desc
  `) as Row[];
  return rows.map((r) => {
    const earned = num(r.earned);
    const paid = num(r.paid);
    return {
      key: String(r.key),
      label: String(r.label),
      leads: num(r.leads),
      disbursed: num(r.disbursed),
      disbursedVolumePaise: num(r.volume),
      earnedPaise: earned,
      paidPaise: paid,
      balancePaise: earned - paid,
    };
  });
}
