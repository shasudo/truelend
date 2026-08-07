import "server-only";
import type { Database } from "@truelend/db";
import { channelForKind, normalizeSafeInteger, products } from "@truelend/reference";

// These aggregates are gnarly (FILTER clauses, date_trunc, cross-table joins),
// so they use the raw postgres.js client (db.$client) rather than the query
// builder. Counts are cast ::int; paise sums arrive as numeric strings and are
// rejected if an aggregate exceeds JavaScript's safe integer range.

type Row = Record<string, unknown>;
const num = (value: unknown) => normalizeSafeInteger(value, "MIS aggregate");

/*
 * The overview asks two different questions and must never mix them:
 *
 *   ACTIVITY — what happened during a period. Every number is bounded by
 *              [from, to) and changes when the range selector changes.
 *   PIPELINE — what exists right now. Unbounded by definition; a backlog has no
 *              date range, and scoping one to "today" would report almost zero.
 *
 * Each is a scalar-subquery block rather than one grouped pass, so every number
 * is independently readable and can join whichever table it belongs to.
 *
 * Admin and employee variants are separate queries rather than one query with an
 * optional predicate, because AGENTS.md bans conditional empty postgres.js
 * fragments — and because an employee has no business seeing revenue, which is
 * simply absent from their shape rather than zeroed.
 */

export interface ActivityStats {
  newLeads: number;
  callsMade: number;
  contacted: number;
  interested: number;
  applications: number;
  approvals: number;
  disbursed: number;
  disbursedVolumePaise: number;
  /** Admin-only: net revenue realised on cases disbursed in the period. */
  netPaise: number | null;
}

/*
 * `contacted` counts distinct prospects actually REACHED — a dial that rang out
 * or hit an engaged tone is effort, not contact, so the unanswered outcomes are
 * excluded. `callsMade` counts every dial. Four attempts on one number is four
 * calls and zero contacts, and conflating the two is how a call-centre report
 * starts flattering itself.
 *
 * Revenue is attributed to the period a case DISBURSED in, not the period it was
 * logged in: that is when the money is actually earned.
 */
export async function getActivityStats(db: Database, from: Date, to: Date): Promise<ActivityStats> {
  const rows = (await db.$client`
    select
      (select count(*) from leads
        where created_at >= ${from} and created_at < ${to})::int as new_leads,
      (select count(*) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update'
          and created_at >= ${from} and created_at < ${to})::int as calls_made,
      (select count(distinct entity_id) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update'
          and after->>'status' not in ('attempted', 'busy')
          and created_at >= ${from} and created_at < ${to})::int as contacted,
      (select count(distinct entity_id) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update'
          and after->>'status' like 'interested%'
          and created_at >= ${from} and created_at < ${to})::int as interested,
      (select count(*) from loan_cases
        where created_at >= ${from} and created_at < ${to})::int as applications,
      (select count(*) from loan_cases
        where approved_at >= ${from} and approved_at < ${to})::int as approvals,
      (select count(*) from loan_cases
        where disbursed_at >= ${from} and disbursed_at < ${to})::int as disbursed,
      (select coalesce(sum(disbursed_amount_paise), 0) from loan_cases
        where disbursed_at >= ${from} and disbursed_at < ${to}) as disbursed_volume_paise,
      (select coalesce(sum(coalesce(revenue_paise, 0) - coalesce(payout_paise, 0)), 0)
        from loan_cases
        where disbursed_at >= ${from} and disbursed_at < ${to}) as net_paise
  `) as Row[];
  const r = rows[0] ?? {};
  return {
    newLeads: num(r.new_leads),
    callsMade: num(r.calls_made),
    contacted: num(r.contacted),
    interested: num(r.interested),
    applications: num(r.applications),
    approvals: num(r.approvals),
    disbursed: num(r.disbursed),
    disbursedVolumePaise: num(r.disbursed_volume_paise),
    netPaise: num(r.net_paise),
  };
}

/*
 * The same period, one caller's own book. Ownership is `assigned_to` for rows
 * and `actor_id` for effort: the calls counted here are the ones this person
 * actually logged, whoever happens to own the task.
 *
 * A loan case has no assignee of its own, so it inherits the parent lead's — the
 * same rule loanCaseWhere applies.
 */
export async function getMyActivityStats(
  db: Database,
  from: Date,
  to: Date,
  userId: string,
): Promise<ActivityStats> {
  const rows = (await db.$client`
    select
      (select count(*) from leads
        where assigned_to = ${userId}
          and created_at >= ${from} and created_at < ${to})::int as new_leads,
      (select count(*) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update'
          and actor_id = ${userId}
          and created_at >= ${from} and created_at < ${to})::int as calls_made,
      (select count(distinct entity_id) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update'
          and actor_id = ${userId} and after->>'status' not in ('attempted', 'busy')
          and created_at >= ${from} and created_at < ${to})::int as contacted,
      (select count(distinct entity_id) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update'
          and actor_id = ${userId} and after->>'status' like 'interested%'
          and created_at >= ${from} and created_at < ${to})::int as interested,
      (select count(*) from loan_cases c join leads l on l.id = c.lead_id
        where l.assigned_to = ${userId}
          and c.created_at >= ${from} and c.created_at < ${to})::int as applications,
      (select count(*) from loan_cases c join leads l on l.id = c.lead_id
        where l.assigned_to = ${userId}
          and c.approved_at >= ${from} and c.approved_at < ${to})::int as approvals,
      (select count(*) from loan_cases c join leads l on l.id = c.lead_id
        where l.assigned_to = ${userId}
          and c.disbursed_at >= ${from} and c.disbursed_at < ${to})::int as disbursed,
      (select coalesce(sum(c.disbursed_amount_paise), 0)
        from loan_cases c join leads l on l.id = c.lead_id
        where l.assigned_to = ${userId}
          and c.disbursed_at >= ${from} and c.disbursed_at < ${to}) as disbursed_volume_paise
  `) as Row[];
  const r = rows[0] ?? {};
  return {
    newLeads: num(r.new_leads),
    callsMade: num(r.calls_made),
    contacted: num(r.contacted),
    interested: num(r.interested),
    applications: num(r.applications),
    approvals: num(r.approvals),
    disbursed: num(r.disbursed),
    disbursedVolumePaise: num(r.disbursed_volume_paise),
    netPaise: null,
  };
}

export interface PipelineStats {
  uncontacted: number;
  followUps: number;
  followUpsOverdue: number;
  interested: number;
  docsPending: number;
  applicationsPending: number;
  awaitingDisbursement: number;
}

/*
 * What is sitting in the funnel right now, one stage per number, in the order
 * work flows through them. Deliberately not date-bounded: a lead imported six
 * weeks ago and never dialled is exactly the row a backlog view exists to show.
 */
export async function getPipelineStats(db: Database): Promise<PipelineStats> {
  const rows = (await db.$client`
    select
      (select count(*) from call_tasks where status = 'new')::int as uncontacted,
      (select count(*) from call_tasks where status = 'callback_scheduled')::int as follow_ups,
      (select count(*) from call_tasks
        where status = 'callback_scheduled' and callback_at <= now())::int as follow_ups_overdue,
      (select count(*) from call_tasks where status in ('interested', 'interested_card', 'interested_both'))::int as interested,
      (select count(*) from leads where status = 'qualified')::int as docs_pending,
      (select count(*) from loan_cases where status = 'logged_in')::int as applications_pending,
      (select count(*) from loan_cases where status = 'approved')::int as awaiting_disbursement
  `) as Row[];
  const r = rows[0] ?? {};
  return {
    uncontacted: num(r.uncontacted),
    followUps: num(r.follow_ups),
    followUpsOverdue: num(r.follow_ups_overdue),
    interested: num(r.interested),
    docsPending: num(r.docs_pending),
    applicationsPending: num(r.applications_pending),
    awaitingDisbursement: num(r.awaiting_disbursement),
  };
}

export async function getMyPipelineStats(db: Database, userId: string): Promise<PipelineStats> {
  const rows = (await db.$client`
    select
      (select count(*) from call_tasks
        where assigned_to = ${userId} and status = 'new')::int as uncontacted,
      (select count(*) from call_tasks
        where assigned_to = ${userId} and status = 'callback_scheduled')::int as follow_ups,
      (select count(*) from call_tasks
        where assigned_to = ${userId} and status = 'callback_scheduled'
          and callback_at <= now())::int as follow_ups_overdue,
      (select count(*) from call_tasks
        where assigned_to = ${userId}
          and status in ('interested', 'interested_card', 'interested_both'))::int as interested,
      (select count(*) from leads
        where assigned_to = ${userId} and status = 'qualified')::int as docs_pending,
      (select count(*) from loan_cases c join leads l on l.id = c.lead_id
        where l.assigned_to = ${userId} and c.status = 'logged_in')::int as applications_pending,
      (select count(*) from loan_cases c join leads l on l.id = c.lead_id
        where l.assigned_to = ${userId} and c.status = 'approved')::int as awaiting_disbursement
  `) as Row[];
  const r = rows[0] ?? {};
  return {
    uncontacted: num(r.uncontacted),
    followUps: num(r.follow_ups),
    followUpsOverdue: num(r.follow_ups_overdue),
    interested: num(r.interested),
    docsPending: num(r.docs_pending),
    applicationsPending: num(r.applications_pending),
    awaitingDisbursement: num(r.awaiting_disbursement),
  };
}

export interface TimePoint {
  day: string;
  count: number;
}

/*
 * Days are IST, matching the range boundaries — bucketing by UTC day would put
 * every lead created before 05:30 IST on the previous day's bar.
 *
 * The lower bound is clamped to 90 days so "All time" cannot render a bar per
 * day since launch. The tiles above are the number that has to be exact; this is
 * a shape, and a shape nobody can read is worse than a shorter one.
 */
export async function getLeadsOverTime(db: Database, from: Date, to: Date): Promise<TimePoint[]> {
  const rows = (await db.$client`
    select
      to_char(date_trunc('day', created_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD') as day,
      count(*)::int as n
    from leads
    where created_at >= greatest(${from}::timestamptz, ${to}::timestamptz - interval '90 days')
      and created_at < ${to}
    group by 1 order by 1
  `) as Row[];
  return rows.map((r) => ({ day: String(r.day), count: num(r.n) }));
}

export interface NamedCount {
  name: string;
  count: number;
}

export async function getLeadsByProduct(db: Database, from: Date, to: Date): Promise<NamedCount[]> {
  const rows = (await db.$client`
    select product_slug, count(*)::int as n
    from leads
    where product_slug is not null and created_at >= ${from} and created_at < ${to}
    group by 1 order by n desc
  `) as Row[];
  return rows.map((r) => ({
    name: products.find((p) => p.slug === r.product_slug)?.shortName ?? String(r.product_slug),
    count: num(r.n),
  }));
}

export async function getLeadsByChannel(db: Database, from: Date, to: Date): Promise<NamedCount[]> {
  const rows = (await db.$client`
    select le.kind, (le.partner_id is not null) as is_partner_lead, count(*)::int as n
    from leads le
    where le.created_at >= ${from} and le.created_at < ${to}
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
