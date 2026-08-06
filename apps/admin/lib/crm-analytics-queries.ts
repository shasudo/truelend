import "server-only";
import type { Database } from "@truelend/db";
import { callStatusLabels, normalizeSafeInteger } from "@truelend/reference";
import type { NamedCount, TimePoint } from "./mis-queries";

/*
 * Call-queue analytics. Like mis-queries.ts these use the raw postgres.js
 * client (db.$client) rather than the query builder, because they are all
 * FILTER-clause aggregates and date_trunc. Counts are cast ::int and passed
 * through normalizeSafeInteger, which rejects anything outside JavaScript's
 * safe integer range instead of silently rounding it.
 *
 * "Open", "callbacks due" and "conversions" are defined here exactly as
 * getEmployeeOverviewStats defines them, so a caller's dashboard tile and this
 * page can never disagree about what their number means.
 *
 * Two different notions of "a caller's work" appear below and are deliberately
 * not merged:
 *   - ownership  — call_tasks.assigned_to. Counts, outcomes and money.
 *   - effort     — audit_log.actor_id on call_task.* rows. Calls logged, when
 *                  they were logged, and when the caller was last active.
 * They match for a caller working their own queue and diverge when somebody
 * else logs an outcome on a task, which is itself worth being able to see.
 *
 * Windows are rolling (24h / 7d / 30d) rather than IST calendar days: a
 * calendar day needs a timezone shift on an index-covered column, and "in the
 * last 24 hours" is the question an operations lead actually asks. The one
 * exception is the hour-of-day histogram, which is meaningless outside IST.
 */

type Row = Record<string, unknown>;
const num = (value: unknown) => normalizeSafeInteger(value, "Call queue aggregate");
/** Aggregates that are legitimately absent (no touched task, no conversion) stay null rather than becoming a lying 0. */
const numOrNull = (value: unknown) => (value == null ? null : num(value));
const str = (value: unknown) => (value == null ? null : String(value));

/** Whole percent. Zero handled rather than emitting NaN into the page. */
function rate(converted: number, total: number): number {
  return total === 0 ? 0 : Math.round((converted / total) * 100);
}

/** One decimal, for per-task averages where whole numbers hide the difference between 1.2 and 1.9. */
function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 10) / 10;
}

const OPEN = "status not in ('converted','not_interested','wrong_number')";

export interface CallQueueStats {
  total: number;
  open: number;
  unassigned: number;
  untouched: number;
  callbacksScheduled: number;
  callbacksOverdue: number;
  converted: number;
  conversionRate: number;
  contactRate: number;
  imported24h: number;
  imported7d: number;
  imported30d: number;
  callsLogged24h: number;
  callsLogged7d: number;
  callsLogged30d: number;
  callsLoggedTotal: number;
  activeCallers7d: number;
  avgOpenAgeDays: number;
  oldestOpenDays: number;
  avgFirstTouchHours: number | null;
  avgDaysToConvert: number | null;
  avgTouchesPerConversion: number;
  duplicatePhones: number;
  convertedWithCase: number;
  disbursedCases: number;
  disbursedVolumePaise: number;
  netPaise: number;
}

/*
 * Scalar subqueries rather than one grouped pass, the same shape
 * getOverviewStats uses: each number is independently readable, and the
 * touch/money numbers live in different tables anyway.
 */
export async function getCallQueueStats(db: Database): Promise<CallQueueStats> {
  const sql = db.$client;
  const rows = (await sql`
    with touches as (
      select entity_id, count(*)::int as n, min(created_at) as first_at
      from audit_log
      where entity_type = 'call_task' and action = 'call_task.status_update'
      group by 1
    )
    select
      count(*)::int as total,
      count(*) filter (where ${sql.unsafe(OPEN)})::int as open,
      count(*) filter (where assigned_to is null and ${sql.unsafe(OPEN)})::int as unassigned,
      count(*) filter (where status = 'callback_scheduled')::int as callbacks_scheduled,
      count(*) filter (where status = 'callback_scheduled' and callback_at <= now())::int
        as callbacks_overdue,
      count(*) filter (where status = 'converted')::int as converted,
      count(*) filter (where created_at > now() - interval '24 hours')::int as imported_24h,
      count(*) filter (where created_at > now() - interval '7 days')::int as imported_7d,
      count(*) filter (where created_at > now() - interval '30 days')::int as imported_30d,
      (count(*) - count(distinct phone))::int as duplicate_phones,
      coalesce(round(avg(extract(epoch from now() - created_at) / 86400)
        filter (where ${sql.unsafe(OPEN)})), 0)::int as avg_open_age_days,
      coalesce(round(max(extract(epoch from now() - created_at) / 86400)
        filter (where ${sql.unsafe(OPEN)})), 0)::int as oldest_open_days,
      (select count(*) from touches t
        join call_tasks ct on ct.id::text = t.entity_id)::int as touched,
      (select round(avg(extract(epoch from t.first_at - ct.created_at) / 3600))::int
        from touches t join call_tasks ct on ct.id::text = t.entity_id) as avg_first_touch_hours,
      (select count(*) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update')::int
        as calls_logged_total,
      (select count(*) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update'
          and created_at > now() - interval '24 hours')::int as calls_logged_24h,
      (select count(*) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update'
          and created_at > now() - interval '7 days')::int as calls_logged_7d,
      (select count(*) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update'
          and created_at > now() - interval '30 days')::int as calls_logged_30d,
      (select count(distinct actor_id) from audit_log
        where entity_type = 'call_task' and action = 'call_task.status_update'
          and created_at > now() - interval '7 days')::int as active_callers_7d,
      (select round(avg(extract(epoch from a.created_at - ct.created_at) / 86400))::int
        from audit_log a join call_tasks ct on ct.id::text = a.entity_id
        where a.entity_type = 'call_task' and a.action = 'call_task.convert')
        as avg_days_to_convert,
      (select coalesce(sum(t.n), 0)::int from touches t
        join call_tasks ct on ct.id::text = t.entity_id and ct.status = 'converted')
        as converted_touches,
      (select count(distinct ct.id) from call_tasks ct
        join loan_cases c on c.lead_id = ct.lead_id)::int as converted_with_case,
      (select count(*) from call_tasks ct
        join loan_cases c on c.lead_id = ct.lead_id and c.status = 'disbursed')::int
        as disbursed_cases,
      (select coalesce(sum(c.disbursed_amount_paise), 0) from call_tasks ct
        join loan_cases c on c.lead_id = ct.lead_id and c.status = 'disbursed')
        as disbursed_volume_paise,
      (select coalesce(sum(coalesce(c.revenue_paise, 0) - coalesce(c.payout_paise, 0)), 0)
        from call_tasks ct join loan_cases c on c.lead_id = ct.lead_id) as net_paise
    from call_tasks
  `) as Row[];
  const r = rows[0] ?? {};
  const total = num(r.total);
  const converted = num(r.converted);
  const touched = num(r.touched);
  return {
    total,
    open: num(r.open),
    unassigned: num(r.unassigned),
    untouched: total - touched,
    callbacksScheduled: num(r.callbacks_scheduled),
    callbacksOverdue: num(r.callbacks_overdue),
    converted,
    conversionRate: rate(converted, total),
    contactRate: rate(touched, total),
    imported24h: num(r.imported_24h),
    imported7d: num(r.imported_7d),
    imported30d: num(r.imported_30d),
    callsLogged24h: num(r.calls_logged_24h),
    callsLogged7d: num(r.calls_logged_7d),
    callsLogged30d: num(r.calls_logged_30d),
    callsLoggedTotal: num(r.calls_logged_total),
    activeCallers7d: num(r.active_callers_7d),
    avgOpenAgeDays: num(r.avg_open_age_days),
    oldestOpenDays: num(r.oldest_open_days),
    avgFirstTouchHours: numOrNull(r.avg_first_touch_hours),
    avgDaysToConvert: numOrNull(r.avg_days_to_convert),
    avgTouchesPerConversion: ratio(num(r.converted_touches), converted),
    duplicatePhones: num(r.duplicate_phones),
    convertedWithCase: num(r.converted_with_case),
    disbursedCases: num(r.disbursed_cases),
    disbursedVolumePaise: num(r.disbursed_volume_paise),
    netPaise: num(r.net_paise),
  };
}

export interface CallerPerformance {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Tasks the caller owns right now, whatever their outcome. */
  assigned: number;
  open: number;
  neverTouched: number;
  attempted: number;
  callbacksScheduled: number;
  callbacksDue: number;
  interested: number;
  notInterested: number;
  wrongNumber: number;
  converted: number;
  /** Owned tasks with at least one outcome logged on them, by anyone. */
  touched: number;
  /** Outcomes this caller logged, on any task. */
  calls: number;
  calls7d: number;
  calls24h: number;
  formsEmailed: number;
  contactRate: number;
  conversionRate: number;
  avgCallsPerTask: number;
  avgFirstTouchHours: number | null;
  avgDaysToConvert: number | null;
  lastActivityAt: string | null;
  disbursedCases: number;
  disbursedVolumePaise: number;
  netPaise: number;
}

/*
 * Left-joined off `user` so a caller holding nothing still appears as a zero
 * row — "who has no work" is exactly as useful here as "who has the most",
 * and an inner join would hide them.
 *
 * Every dimension is pre-aggregated in its own CTE and then joined 1:1. A
 * single grouped join across call_tasks, loan_cases and audit_log would
 * multiply every count by the number of rows in the other two.
 */
export async function getCallQueueByCaller(db: Database): Promise<CallerPerformance[]> {
  const sql = db.$client;
  const rows = (await sql`
    with owned as (
      select
        assigned_to as uid,
        count(*)::int as assigned,
        count(*) filter (where ${sql.unsafe(OPEN)})::int as open,
        count(*) filter (where status = 'attempted')::int as attempted,
        count(*) filter (where status = 'callback_scheduled')::int as callbacks_scheduled,
        count(*) filter (where status = 'callback_scheduled' and callback_at <= now())::int
          as callbacks_due,
        count(*) filter (where status = 'interested')::int as interested,
        count(*) filter (where status = 'not_interested')::int as not_interested,
        count(*) filter (where status = 'wrong_number')::int as wrong_number,
        count(*) filter (where status = 'converted')::int as converted
      from call_tasks
      where assigned_to is not null
      group by 1
    ),
    first_touch as (
      select entity_id, min(created_at) as first_at
      from audit_log
      where entity_type = 'call_task' and action = 'call_task.status_update'
      group by 1
    ),
    worked as (
      select
        t.assigned_to as uid,
        count(*)::int as touched,
        round(avg(extract(epoch from f.first_at - t.created_at) / 3600))::int
          as avg_first_touch_hours
      from call_tasks t
        join first_touch f on f.entity_id = t.id::text
      where t.assigned_to is not null
      group by 1
    ),
    effort as (
      select
        actor_id as uid,
        count(*) filter (where action = 'call_task.status_update')::int as calls,
        count(*) filter (
          where action = 'call_task.status_update' and created_at > now() - interval '7 days'
        )::int as calls_7d,
        count(*) filter (
          where action = 'call_task.status_update' and created_at > now() - interval '24 hours'
        )::int as calls_24h,
        count(*) filter (where action = 'call_task.form_emailed')::int as forms_emailed,
        -- Bulk assign/balance rows are an admin moving work around, not a
        -- caller working it, so they must not pass for "last active".
        max(created_at) filter (
          where action in ('call_task.status_update', 'call_task.convert', 'call_task.form_emailed')
        ) as last_activity_at
      from audit_log
      where entity_type = 'call_task' and actor_id is not null
      group by 1
    ),
    speed as (
      select
        t.assigned_to as uid,
        round(avg(extract(epoch from a.created_at - t.created_at) / 86400))::int
          as avg_days_to_convert
      from call_tasks t
        join audit_log a
          on a.entity_id = t.id::text
          and a.entity_type = 'call_task'
          and a.action = 'call_task.convert'
      where t.assigned_to is not null
      group by 1
    ),
    money as (
      select
        t.assigned_to as uid,
        count(*) filter (where c.status = 'disbursed')::int as disbursed_cases,
        coalesce(sum(c.disbursed_amount_paise) filter (where c.status = 'disbursed'), 0)
          as disbursed_volume_paise,
        coalesce(sum(coalesce(c.revenue_paise, 0) - coalesce(c.payout_paise, 0)), 0) as net_paise
      from call_tasks t
        join loan_cases c on c.lead_id = t.lead_id
      where t.assigned_to is not null
      group by 1
    )
    select
      u.id, u.name, u.email, u.role,
      coalesce(o.assigned, 0) as assigned,
      coalesce(o.open, 0) as open,
      coalesce(o.attempted, 0) as attempted,
      coalesce(o.callbacks_scheduled, 0) as callbacks_scheduled,
      coalesce(o.callbacks_due, 0) as callbacks_due,
      coalesce(o.interested, 0) as interested,
      coalesce(o.not_interested, 0) as not_interested,
      coalesce(o.wrong_number, 0) as wrong_number,
      coalesce(o.converted, 0) as converted,
      coalesce(w.touched, 0) as touched,
      w.avg_first_touch_hours,
      coalesce(e.calls, 0) as calls,
      coalesce(e.calls_7d, 0) as calls_7d,
      coalesce(e.calls_24h, 0) as calls_24h,
      coalesce(e.forms_emailed, 0) as forms_emailed,
      e.last_activity_at,
      s.avg_days_to_convert,
      coalesce(m.disbursed_cases, 0) as disbursed_cases,
      coalesce(m.disbursed_volume_paise, 0) as disbursed_volume_paise,
      coalesce(m.net_paise, 0) as net_paise
    from "user" u
      left join owned o on o.uid = u.id
      left join worked w on w.uid = u.id
      left join effort e on e.uid = u.id
      left join speed s on s.uid = u.id
      left join money m on m.uid = u.id
    where u.role in ('admin', 'employee')
      and (u.banned is null or u.banned = false)
    order by coalesce(o.open, 0) desc, coalesce(e.calls, 0) desc, u.name
  `) as Row[];
  return rows.map((r) => {
    const assigned = num(r.assigned);
    const converted = num(r.converted);
    const touched = num(r.touched);
    const calls = num(r.calls);
    return {
      id: String(r.id),
      name: String(r.name),
      email: String(r.email ?? ""),
      role: String(r.role ?? ""),
      assigned,
      open: num(r.open),
      neverTouched: assigned - touched,
      attempted: num(r.attempted),
      callbacksScheduled: num(r.callbacks_scheduled),
      callbacksDue: num(r.callbacks_due),
      interested: num(r.interested),
      notInterested: num(r.not_interested),
      wrongNumber: num(r.wrong_number),
      converted,
      touched,
      calls,
      calls7d: num(r.calls_7d),
      calls24h: num(r.calls_24h),
      formsEmailed: num(r.forms_emailed),
      contactRate: rate(touched, assigned),
      conversionRate: rate(converted, assigned),
      avgCallsPerTask: ratio(calls, assigned),
      avgFirstTouchHours: numOrNull(r.avg_first_touch_hours),
      avgDaysToConvert: numOrNull(r.avg_days_to_convert),
      lastActivityAt: str(r.last_activity_at),
      disbursedCases: num(r.disbursed_cases),
      disbursedVolumePaise: num(r.disbursed_volume_paise),
      netPaise: num(r.net_paise),
    };
  });
}

export async function getCallTasksByStatus(db: Database): Promise<NamedCount[]> {
  const rows = (await db.$client`
    select status, count(*)::int as n from call_tasks group by 1 order by n desc
  `) as Row[];
  return rows.map((r) => ({
    name: callStatusLabels[String(r.status)] ?? String(r.status),
    count: num(r.n),
  }));
}

/** Which outcome a caller actually recorded, counted per logged call rather than per task. */
export async function getLoggedOutcomes(db: Database): Promise<NamedCount[]> {
  const rows = (await db.$client`
    select after->>'status' as status, count(*)::int as n
    from audit_log
    where entity_type = 'call_task' and action = 'call_task.status_update'
      and after->>'status' is not null
    group by 1 order by n desc
  `) as Row[];
  return rows.map((r) => ({
    name: callStatusLabels[String(r.status)] ?? String(r.status),
    count: num(r.n),
  }));
}

export interface SegmentPerformance {
  key: string;
  total: number;
  touched: number;
  contactRate: number;
  interested: number;
  notInterested: number;
  wrongNumber: number;
  converted: number;
  conversionRate: number;
  avgCalls: number;
  disbursedCases: number;
  disbursedVolumePaise: number;
  netPaise: number;
  firstImportedAt: string | null;
  lastImportedAt: string | null;
}

function toSegments(rows: Row[]): SegmentPerformance[] {
  return rows.map((r) => {
    const total = num(r.total);
    const converted = num(r.converted);
    const touched = num(r.touched);
    return {
      key: String(r.key),
      total,
      touched,
      contactRate: rate(touched, total),
      interested: num(r.interested),
      notInterested: num(r.not_interested),
      wrongNumber: num(r.wrong_number),
      converted,
      conversionRate: rate(converted, total),
      avgCalls: ratio(num(r.calls), total),
      disbursedCases: num(r.disbursed_cases),
      disbursedVolumePaise: num(r.disbursed_volume_paise),
      netPaise: num(r.net_paise),
      firstImportedAt: str(r.first_imported_at),
      lastImportedAt: str(r.last_imported_at),
    };
  });
}

/*
 * Which imported list was worth buying — now including what it was worth in
 * rupees, not just in conversions, since a list that converts well into cases
 * that never disburse is a list that cost money.
 *
 * The counts and the money come from two separate joins on purpose: one task
 * can carry several loan cases, and joining both at once would multiply the
 * task counts by the case count.
 */
export async function getCallTasksBySource(db: Database): Promise<SegmentPerformance[]> {
  return toSegments(
    (await segmentQuery(db, `coalesce(nullif(trim(source), ''), 'Untagged')`)) as Row[],
  );
}

export async function getCallTasksByProduct(db: Database): Promise<SegmentPerformance[]> {
  return toSegments(
    (await segmentQuery(db, `coalesce(nullif(trim(product_slug), ''), 'Unknown')`)) as Row[],
  );
}

export async function getCallTasksByCity(db: Database): Promise<SegmentPerformance[]> {
  return toSegments(
    (await segmentQuery(db, `coalesce(nullif(initcap(trim(city)), ''), 'Unknown')`)) as Row[],
  );
}

/*
 * One shape, three groupings. `dimension` is a fixed SQL literal chosen by the
 * three exported functions above and never touches request input — no caller
 * passes a value through, which is what keeps sql.unsafe safe here.
 */
async function segmentQuery(db: Database, dimension: string) {
  const sql = db.$client;
  return (await sql`
    with base as (
      select
        ${sql.unsafe(dimension)} as key,
        id, lead_id, status, created_at
      from call_tasks
    ),
    counts as (
      select
        key,
        count(*)::int as total,
        count(*) filter (where status = 'interested')::int as interested,
        count(*) filter (where status = 'not_interested')::int as not_interested,
        count(*) filter (where status = 'wrong_number')::int as wrong_number,
        count(*) filter (where status = 'converted')::int as converted,
        min(created_at) as first_imported_at,
        max(created_at) as last_imported_at
      from base group by 1
    ),
    effort as (
      select b.key, count(distinct a.entity_id)::int as touched, count(a.*)::int as calls
      from base b
        join audit_log a
          on a.entity_id = b.id::text
          and a.entity_type = 'call_task'
          and a.action = 'call_task.status_update'
      group by 1
    ),
    money as (
      select
        b.key,
        count(*) filter (where c.status = 'disbursed')::int as disbursed_cases,
        coalesce(sum(c.disbursed_amount_paise) filter (where c.status = 'disbursed'), 0)
          as disbursed_volume_paise,
        coalesce(sum(coalesce(c.revenue_paise, 0) - coalesce(c.payout_paise, 0)), 0) as net_paise
      from base b
        join loan_cases c on c.lead_id = b.lead_id
      group by 1
    )
    select
      c.key, c.total, c.interested, c.not_interested, c.wrong_number, c.converted,
      c.first_imported_at, c.last_imported_at,
      coalesce(e.touched, 0) as touched,
      coalesce(e.calls, 0) as calls,
      coalesce(m.disbursed_cases, 0) as disbursed_cases,
      coalesce(m.disbursed_volume_paise, 0) as disbursed_volume_paise,
      coalesce(m.net_paise, 0) as net_paise
    from counts c
      left join effort e on e.key = c.key
      left join money m on m.key = c.key
    order by c.total desc, c.key
    limit 20
  `) as Row[];
}

export async function getCallTasksOverTime(db: Database): Promise<TimePoint[]> {
  const rows = (await db.$client`
    select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, count(*)::int as n
    from call_tasks
    where created_at > now() - interval '30 days'
    group by 1 order by 1
  `) as Row[];
  return rows.map((r) => ({ day: String(r.day), count: num(r.n) }));
}

/** Calls logged per day — effort, where getCallTasksOverTime is intake. */
export async function getCallActivityOverTime(db: Database): Promise<TimePoint[]> {
  const rows = (await db.$client`
    select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, count(*)::int as n
    from audit_log
    where entity_type = 'call_task' and action = 'call_task.status_update'
      and created_at > now() - interval '30 days'
    group by 1 order by 1
  `) as Row[];
  return rows.map((r) => ({ day: String(r.day), count: num(r.n) }));
}

/*
 * When the phone actually rings, in IST — the one place a rolling window will
 * not do, since "we call nobody after 6pm" is the finding. Hours with no calls
 * are filled in JS so the shape of the day stays visible.
 */
export async function getCallActivityByHour(db: Database): Promise<NamedCount[]> {
  const rows = (await db.$client`
    select
      extract(hour from created_at at time zone 'Asia/Kolkata')::int as hour,
      count(*)::int as n
    from audit_log
    where entity_type = 'call_task' and action = 'call_task.status_update'
      and created_at > now() - interval '30 days'
    group by 1 order by 1
  `) as Row[];
  const counts = new Map(rows.map((r) => [num(r.hour), num(r.n)]));
  return Array.from({ length: 24 }, (_, hour) => ({
    name: `${String(hour).padStart(2, "0")}:00`,
    count: counts.get(hour) ?? 0,
  }));
}

/** Open tasks by how long they have been sitting there. Bucket order is the SQL's, not count order. */
export async function getOpenTaskAging(db: Database): Promise<NamedCount[]> {
  const sql = db.$client;
  const rows = (await sql`
    select bucket, sort, count(*)::int as n
    from (
      select
        case
          when created_at > now() - interval '1 day' then 'Under 1 day'
          when created_at > now() - interval '3 days' then '1–3 days'
          when created_at > now() - interval '7 days' then '3–7 days'
          when created_at > now() - interval '14 days' then '1–2 weeks'
          when created_at > now() - interval '30 days' then '2–4 weeks'
          else 'Over a month'
        end as bucket,
        case
          when created_at > now() - interval '1 day' then 1
          when created_at > now() - interval '3 days' then 2
          when created_at > now() - interval '7 days' then 3
          when created_at > now() - interval '14 days' then 4
          when created_at > now() - interval '30 days' then 5
          else 6
        end as sort
      from call_tasks
      where ${sql.unsafe(OPEN)}
    ) aged
    group by 1, 2 order by 2
  `) as Row[];
  return rows.map((r) => ({ name: String(r.bucket), count: num(r.n) }));
}

export interface CallActivityEntry {
  id: string;
  taskId: string | null;
  taskName: string | null;
  phone: string | null;
  actorEmail: string | null;
  action: string;
  status: string | null;
  note: string | null;
  createdAt: string;
}

/*
 * The raw feed. Everything above is an aggregate, and an aggregate cannot tell
 * you that the last forty outcomes were all "wrong number" from one imported
 * list — this can.
 */
export async function getRecentCallActivity(
  db: Database,
  limit = 40,
): Promise<CallActivityEntry[]> {
  const rows = (await db.$client`
    select
      a.id, a.entity_id, a.actor_email, a.action, a.created_at,
      a.after->>'status' as status,
      a.after->>'note' as note,
      t.name as task_name, t.phone
    from audit_log a
      left join call_tasks t on t.id::text = a.entity_id
    where a.entity_type = 'call_task'
    order by a.created_at desc
    limit ${limit}
  `) as Row[];
  return rows.map((r) => ({
    id: String(r.id),
    taskId: str(r.entity_id),
    taskName: str(r.task_name),
    phone: str(r.phone),
    actorEmail: str(r.actor_email),
    action: String(r.action),
    status: str(r.status),
    note: str(r.note),
    createdAt: String(r.created_at),
  }));
}
