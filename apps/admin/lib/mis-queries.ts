import "server-only";
import type { Database } from "@truelend/db";
import { products, channelForKind } from "@truelend/reference";

// These aggregates are gnarly (FILTER clauses, date_trunc, cross-table joins),
// so they use the raw postgres.js client (db.$client) rather than the query
// builder. Counts are cast ::int (→ number); paise sums come back as numeric
// strings and are coerced with Number() (safe well past ₹90 trillion).

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

export interface OverviewStats {
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
    select kind, count(*)::int as n from leads group by 1
  `) as Row[];
  // Fold the four kinds into the two coarse channels.
  const totals = new Map<string, number>();
  for (const r of rows) {
    const ch = channelForKind(String(r.kind));
    totals.set(ch, (totals.get(ch) ?? 0) + num(r.n));
  }
  return [...totals].map(([name, count]) => ({ name, count }));
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

async function caseAggregates(db: Database, groupExpr: "product_slug" | "channel") {
  const sql = db.$client;
  if (groupExpr === "product_slug") {
    return (await sql`
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
  }
  return (await sql`
    select (case when le.kind='referral' then 'referral' else 'direct' end) as k,
      count(lc.*)::int as cases,
      count(lc.*) filter (where lc.status='approved')::int as approved,
      count(lc.*) filter (where lc.status='declined')::int as declined,
      count(lc.*) filter (where lc.status='disbursed')::int as disbursed,
      coalesce(sum(lc.disbursed_amount_paise) filter (where lc.status='disbursed'),0) as volume,
      coalesce(sum(lc.revenue_paise),0) as revenue,
      coalesce(sum(lc.payout_paise),0) as payout
    from loan_cases lc join leads le on le.id = lc.lead_id group by 1
  `) as Row[];
}

export async function getMisByProduct(db: Database): Promise<MisRow[]> {
  const sql = db.$client;
  const leadRows = (await sql`
    select product_slug as k, count(*)::int as n from leads
    where product_slug is not null group by 1
  `) as Row[];
  const caseRows = await caseAggregates(db, "product_slug");

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
  const leadRows = (await sql`select kind, count(*)::int as n from leads group by 1`) as Row[];
  const caseRows = await caseAggregates(db, "channel");

  const leadsByCh = new Map<string, number>();
  for (const r of leadRows) {
    const ch = channelForKind(String(r.kind));
    leadsByCh.set(ch, (leadsByCh.get(ch) ?? 0) + num(r.n));
  }
  const casesByKey = new Map(caseRows.map((r) => [channelForKind(String(r.k)), r]));

  const channels = ["Website · Direct", "Website · Referral"];
  return channels
    .map((label, i): MisRow => {
      const rawKey = i === 0 ? "direct" : "referral";
      const c = casesByKey.get(channelForKind(rawKey)) ?? {};
      const revenue = num(c.revenue);
      const payout = num(c.payout);
      return {
        key: rawKey,
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
    })
    .filter((r) => r.leads > 0 || r.cases > 0);
}
