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
 */

type Row = Record<string, unknown>;
const num = (value: unknown) => normalizeSafeInteger(value, "Call queue aggregate");

/** Whole percent. Zero handled rather than emitting NaN into the page. */
function rate(converted: number, total: number): number {
  return total === 0 ? 0 : Math.round((converted / total) * 100);
}

export interface CallQueueStats {
  total: number;
  open: number;
  unassigned: number;
  callbacksOverdue: number;
  converted: number;
  conversionRate: number;
}

export async function getCallQueueStats(db: Database): Promise<CallQueueStats> {
  const rows = (await db.$client`
    select
      count(*)::int as total,
      count(*) filter (where status not in ('converted','not_interested','wrong_number'))::int
        as open,
      count(*) filter (
        where assigned_to is null
          and status not in ('converted','not_interested','wrong_number')
      )::int as unassigned,
      count(*) filter (where status = 'callback_scheduled' and callback_at <= now())::int
        as callbacks_overdue,
      count(*) filter (where status = 'converted')::int as converted
    from call_tasks
  `) as Row[];
  const r = rows[0] ?? {};
  const total = num(r.total);
  const converted = num(r.converted);
  return {
    total,
    open: num(r.open),
    unassigned: num(r.unassigned),
    callbacksOverdue: num(r.callbacks_overdue),
    converted,
    conversionRate: rate(converted, total),
  };
}

export interface CallerPerformance {
  id: string;
  name: string;
  open: number;
  callbacksDue: number;
  converted: number;
  handled: number;
  conversionRate: number;
}

/*
 * Left-joined off `user` so a caller holding nothing still appears as a zero
 * row — "who has no work" is exactly as useful here as "who has the most",
 * and an inner join would hide them.
 */
export async function getCallQueueByCaller(db: Database): Promise<CallerPerformance[]> {
  const rows = (await db.$client`
    select
      u.id, u.name,
      count(t.*) filter (where t.status not in ('converted','not_interested','wrong_number'))::int
        as open,
      count(t.*) filter (where t.status = 'callback_scheduled' and t.callback_at <= now())::int
        as callbacks_due,
      count(t.*) filter (where t.status = 'converted')::int as converted,
      count(t.*)::int as handled
    from "user" u
      left join call_tasks t on t.assigned_to = u.id
    where u.role in ('admin', 'employee')
      and (u.banned is null or u.banned = false)
    group by u.id, u.name
    order by open desc, u.name
  `) as Row[];
  return rows.map((r) => {
    const handled = num(r.handled);
    const converted = num(r.converted);
    return {
      id: String(r.id),
      name: String(r.name),
      open: num(r.open),
      callbacksDue: num(r.callbacks_due),
      converted,
      handled,
      conversionRate: rate(converted, handled),
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

export interface SourcePerformance {
  source: string;
  total: number;
  converted: number;
  conversionRate: number;
}

/*
 * Which imported list was worth buying. `source` is free text from the CSV, so
 * this is capped — and rows without one are grouped under a single label
 * rather than dropped, since "we didn't tag it" is itself worth seeing.
 */
export async function getCallTasksBySource(db: Database): Promise<SourcePerformance[]> {
  const rows = (await db.$client`
    select
      coalesce(nullif(trim(source), ''), 'Untagged') as source,
      count(*)::int as total,
      count(*) filter (where status = 'converted')::int as converted
    from call_tasks
    group by 1
    order by total desc
    limit 20
  `) as Row[];
  return rows.map((r) => {
    const total = num(r.total);
    const converted = num(r.converted);
    return {
      source: String(r.source),
      total,
      converted,
      conversionRate: rate(converted, total),
    };
  });
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
