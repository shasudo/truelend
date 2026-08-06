import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Card, StatTile } from "@truelend/ui";
import { callStatusLabels, formatDateTime, formatPaise } from "@truelend/reference";
import { PageTitle } from "@/components/page-title";
import { CategoryBars, TrendChart } from "@/components/dashboard-charts";
import { getAuthContext, requireAdmin } from "@/lib/auth";
import {
  getCallActivityByHour,
  getCallActivityOverTime,
  getCallQueueByCaller,
  getCallQueueStats,
  getCallTasksByCity,
  getCallTasksByProduct,
  getCallTasksBySource,
  getCallTasksByStatus,
  getCallTasksOverTime,
  getLoggedOutcomes,
  getOpenTaskAging,
  getRecentCallActivity,
  type CallerPerformance,
  type SegmentPerformance,
} from "@/lib/crm-analytics-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Call Queue Analytics" };

const n = (value: number) => value.toLocaleString("en-IN");

/** Hours read badly past a couple of days; days read badly under one. */
function duration(hours: number | null, unit: "hours" | "days"): string {
  if (hours == null) return "—";
  if (unit === "days") return `${n(hours)}d`;
  return hours < 48 ? `${n(hours)}h` : `${n(Math.round(hours / 24))}d`;
}

const when = (value: string | null) => (value ? formatDateTime(new Date(value)) : "—");

const TH = "px-4 py-3 font-semibold";
const THR = "px-4 py-3 text-right font-semibold";
const TD = "px-4 py-3 tabular-nums text-navy-700";
const TDR = `${TD} text-right`;

interface SectionProps {
  title: string;
  sub?: string;
  children: React.ReactNode;
}

function Section({ title, sub, children }: SectionProps) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-navy-950">{title}</h2>
      {sub && <p className="mb-3 mt-0.5 text-sm text-muted">{sub}</p>}
      <div className={sub ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

interface WideTableProps {
  minWidth: number;
  children: React.ReactNode;
}

function WideTable({ minWidth, children }: WideTableProps) {
  return (
    <Card className="max-w-full overscroll-x-contain overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth: `${minWidth}px` }}>
        {children}
      </table>
    </Card>
  );
}

interface SegmentTableProps {
  dimension: string;
  rows: SegmentPerformance[];
  /** Query param on /crm that filters the queue by this dimension, when one exists. */
  filterParam?: string;
  empty: string;
}

/*
 * Source, product and city are the same question asked three ways — "was this
 * slice of the list worth working" — so they render through one table rather
 * than three near-identical ones.
 */
function SegmentTable({ dimension, rows, filterParam, empty }: SegmentTableProps) {
  return (
    <WideTable minWidth={1180}>
      <thead>
        <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
          <th className={TH}>{dimension}</th>
          <th className={THR}>Tasks</th>
          <th className={THR}>Worked</th>
          <th className={THR}>Contact %</th>
          <th className={THR}>Calls/task</th>
          <th className={THR}>Interested</th>
          <th className={THR}>Not int.</th>
          <th className={THR}>Wrong no.</th>
          <th className={THR}>Converted</th>
          <th className={THR}>Conv %</th>
          <th className={THR}>Disbursed</th>
          <th className={THR}>Volume</th>
          <th className={THR}>Net</th>
          <th className={THR}>First seen</th>
          <th className={THR}>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={15} className="px-4 py-12 text-center text-muted">
              {empty}
            </td>
          </tr>
        )}
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-hairline last:border-b-0 hover:bg-paper">
            <td className="px-4 py-3 font-medium text-navy-950">
              {filterParam ? (
                <Link
                  href={`/crm?${filterParam}=${encodeURIComponent(row.key)}`}
                  className="hover:text-red-600"
                >
                  {row.key}
                </Link>
              ) : (
                row.key
              )}
            </td>
            <td className={TDR}>{n(row.total)}</td>
            <td className={TDR}>{n(row.touched)}</td>
            <td className={TDR}>{row.contactRate}%</td>
            <td className={TDR}>{row.avgCalls}</td>
            <td className={TDR}>{n(row.interested)}</td>
            <td className={TDR}>{n(row.notInterested)}</td>
            <td className={TDR}>{n(row.wrongNumber)}</td>
            <td className={TDR}>{n(row.converted)}</td>
            <td className={`${TDR} font-semibold text-navy-950`}>{row.conversionRate}%</td>
            <td className={TDR}>{n(row.disbursedCases)}</td>
            <td className={TDR}>{formatPaise(row.disbursedVolumePaise)}</td>
            <td className={`${TDR} font-semibold text-navy-950`}>{formatPaise(row.netPaise)}</td>
            <td className={`${TDR} whitespace-nowrap text-navy-500`}>
              {when(row.firstImportedAt)}
            </td>
            <td className={`${TDR} whitespace-nowrap text-navy-500`}>{when(row.lastImportedAt)}</td>
          </tr>
        ))}
      </tbody>
    </WideTable>
  );
}

interface CallerCellProps {
  caller: CallerPerformance;
}

/** Name over email, so a leaderboard row identifies the person unambiguously. */
function CallerCell({ caller }: CallerCellProps) {
  return (
    <td className="px-4 py-3">
      <Link
        href={`/crm?assignee=${encodeURIComponent(caller.id)}`}
        className="font-medium text-navy-950 hover:text-red-600"
      >
        {caller.name}
      </Link>
      <p className="truncate text-xs text-muted" title={caller.email}>
        {caller.email}
        {caller.role === "admin" && " · admin"}
      </p>
    </td>
  );
}

/*
 * Operational analytics for the outbound queue — who is carrying what, who is
 * actually dialling, who converts, and which imported list was worth buying.
 * Deliberately separate from /mis, which reports money across the whole
 * business: mixing a caller leaderboard into a P&L makes both harder to read,
 * and this one is useful to look at daily.
 */
export default async function CallQueueAnalyticsPage() {
  await requireAdmin();
  const { db } = getAuthContext();
  const [
    stats,
    callers,
    byStatus,
    loggedOutcomes,
    bySource,
    byProduct,
    byCity,
    imported,
    activity,
    byHour,
    aging,
    feed,
  ] = await Promise.all([
    getCallQueueStats(db),
    getCallQueueByCaller(db),
    getCallTasksByStatus(db),
    getLoggedOutcomes(db),
    getCallTasksBySource(db),
    getCallTasksByProduct(db),
    getCallTasksByCity(db),
    getCallTasksOverTime(db),
    getCallActivityOverTime(db),
    getCallActivityByHour(db),
    getOpenTaskAging(db),
    getRecentCallActivity(db),
  ]);

  return (
    <>
      <Link
        href="/crm"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to call queue
      </Link>

      <PageTitle
        title="Call Queue Analytics"
        subtitle={`${n(stats.total)} ${stats.total === 1 ? "task" : "tasks"} imported all time · ${n(stats.callsLoggedTotal)} outcomes logged`}
      />

      <Section title="Queue" sub="Where the list stands right now.">
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
          <StatTile label="Open" value={n(stats.open)} sub="Still workable" />
          <StatTile
            label="Unassigned"
            value={n(stats.unassigned)}
            sub="Nobody is calling these"
            accent={stats.unassigned > 0}
          />
          <StatTile
            label="Never touched"
            value={n(stats.untouched)}
            sub="No outcome ever logged"
            accent={stats.untouched > 0}
          />
          <StatTile
            label="Callbacks overdue"
            value={n(stats.callbacksOverdue)}
            sub={`Of ${n(stats.callbacksScheduled)} scheduled`}
            accent={stats.callbacksOverdue > 0}
          />
          <StatTile
            label="Avg open age"
            value={`${n(stats.avgOpenAgeDays)}d`}
            sub={`Oldest ${n(stats.oldestOpenDays)}d`}
          />
          <StatTile
            label="Duplicate numbers"
            value={n(stats.duplicatePhones)}
            sub="Same phone imported twice"
            accent={stats.duplicatePhones > 0}
          />
          <StatTile
            label="Imported 7d"
            value={n(stats.imported7d)}
            sub={`${n(stats.imported24h)} in 24h · ${n(stats.imported30d)} in 30d`}
          />
          <StatTile label="Contact rate" value={`${stats.contactRate}%`} sub="Tasks ever worked" />
        </div>
      </Section>

      <Section title="Effort" sub="How much dialling is actually happening.">
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
          <StatTile label="Calls logged 24h" value={n(stats.callsLogged24h)} />
          <StatTile
            label="Calls logged 7d"
            value={n(stats.callsLogged7d)}
            sub={`${n(stats.callsLogged30d)} in 30d`}
          />
          <StatTile
            label="Active callers 7d"
            value={n(stats.activeCallers7d)}
            sub="Logged at least one outcome"
          />
          <StatTile
            label="Time to first call"
            value={duration(stats.avgFirstTouchHours, "hours")}
            sub="Average, from import"
          />
          <StatTile label="Converted" value={n(stats.converted)} />
          <StatTile label="Conversion rate" value={`${stats.conversionRate}%`} sub="Of all tasks" />
          <StatTile
            label="Calls per conversion"
            value={stats.avgTouchesPerConversion || "—"}
            sub="Average attempts it took"
          />
          <StatTile
            label="Days to convert"
            value={duration(stats.avgDaysToConvert, "days")}
            sub="Average, from import"
          />
        </div>
      </Section>

      <Section
        title="Value"
        sub="What the queue produced downstream. Converted tasks, followed to their loan cases."
      >
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Reached a case"
            value={n(stats.convertedWithCase)}
            sub={`Of ${n(stats.converted)} conversions`}
          />
          <StatTile label="Disbursed cases" value={n(stats.disbursedCases)} />
          <StatTile label="Disbursed volume" value={formatPaise(stats.disbursedVolumePaise)} />
          <StatTile
            label="Net revenue"
            value={formatPaise(stats.netPaise)}
            sub="Revenue less payout"
          />
        </div>
      </Section>

      <Section
        title="Callers — workload"
        sub="What each caller is holding, and how hard they are working it. Calls are counted from who logged the outcome; everything else from who owns the task."
      >
        <WideTable minWidth={1180}>
          <thead>
            <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
              <th className={TH}>Caller</th>
              <th className={THR}>Assigned</th>
              <th className={THR}>Open</th>
              <th className={THR}>Untouched</th>
              <th className={THR}>Attempted</th>
              <th className={THR}>Callbacks</th>
              <th className={THR}>Overdue</th>
              <th className={THR}>Calls 24h</th>
              <th className={THR}>Calls 7d</th>
              <th className={THR}>Calls total</th>
              <th className={THR}>Calls/task</th>
              <th className={THR}>1st call</th>
              <th className={THR}>Last active</th>
            </tr>
          </thead>
          <tbody>
            {callers.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-12 text-center text-muted">
                  No active callers yet.
                </td>
              </tr>
            )}
            {callers.map((caller) => (
              <tr
                key={caller.id}
                className="border-b border-hairline last:border-b-0 hover:bg-paper"
              >
                <CallerCell caller={caller} />
                <td className={TDR}>{n(caller.assigned)}</td>
                <td className={TDR}>{n(caller.open)}</td>
                <td className={TDR}>
                  <span className={caller.neverTouched > 0 ? "text-red-600" : undefined}>
                    {n(caller.neverTouched)}
                  </span>
                </td>
                <td className={TDR}>{n(caller.attempted)}</td>
                <td className={TDR}>{n(caller.callbacksScheduled)}</td>
                <td className={TDR}>
                  <span className={caller.callbacksDue > 0 ? "text-red-600" : undefined}>
                    {n(caller.callbacksDue)}
                  </span>
                </td>
                <td className={TDR}>{n(caller.calls24h)}</td>
                <td className={TDR}>{n(caller.calls7d)}</td>
                <td className={TDR}>{n(caller.calls)}</td>
                <td className={TDR}>{caller.avgCallsPerTask}</td>
                <td className={TDR}>{duration(caller.avgFirstTouchHours, "hours")}</td>
                <td className={`${TDR} whitespace-nowrap text-navy-500`}>
                  {when(caller.lastActivityAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </WideTable>
      </Section>

      <Section title="Callers — outcomes and value" sub="What that work turned into.">
        <WideTable minWidth={1180}>
          <thead>
            <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
              <th className={TH}>Caller</th>
              <th className={THR}>Contact %</th>
              <th className={THR}>Interested</th>
              <th className={THR}>Not int.</th>
              <th className={THR}>Wrong no.</th>
              <th className={THR}>Forms sent</th>
              <th className={THR}>Converted</th>
              <th className={THR}>Conv %</th>
              <th className={THR}>Days to convert</th>
              <th className={THR}>Disbursed</th>
              <th className={THR}>Volume</th>
              <th className={THR}>Net</th>
            </tr>
          </thead>
          <tbody>
            {callers.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-muted">
                  No active callers yet.
                </td>
              </tr>
            )}
            {callers.map((caller) => (
              <tr
                key={caller.id}
                className="border-b border-hairline last:border-b-0 hover:bg-paper"
              >
                <CallerCell caller={caller} />
                <td className={TDR}>{caller.contactRate}%</td>
                <td className={TDR}>{n(caller.interested)}</td>
                <td className={TDR}>{n(caller.notInterested)}</td>
                <td className={TDR}>{n(caller.wrongNumber)}</td>
                <td className={TDR}>{n(caller.formsEmailed)}</td>
                <td className={TDR}>{n(caller.converted)}</td>
                <td className={`${TDR} font-semibold text-navy-950`}>{caller.conversionRate}%</td>
                <td className={TDR}>{duration(caller.avgDaysToConvert, "days")}</td>
                <td className={TDR}>{n(caller.disbursedCases)}</td>
                <td className={TDR}>{formatPaise(caller.disbursedVolumePaise)}</td>
                <td className={`${TDR} font-semibold text-navy-950`}>
                  {formatPaise(caller.netPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </WideTable>
      </Section>

      <Section
        title="By source list"
        sub="Which imported list was worth buying — in rupees, not just conversions."
      >
        <SegmentTable
          dimension="Source"
          rows={bySource}
          filterParam="source"
          empty="No call tasks imported yet."
        />
      </Section>

      <Section title="By product">
        <SegmentTable dimension="Product" rows={byProduct} empty="No call tasks imported yet." />
      </Section>

      <Section title="By city">
        <SegmentTable dimension="City" rows={byCity} empty="No call tasks imported yet." />
      </Section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-950">Queue by outcome</h2>
          <p className="mt-0.5 text-sm text-muted">Where every task currently sits.</p>
          <div className="mt-5">
            <CategoryBars data={byStatus} label="Call task counts by current status" />
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-950">Outcomes logged</h2>
          <p className="mt-0.5 text-sm text-muted">
            Every recorded call, including ones later overwritten.
          </p>
          <div className="mt-5">
            <CategoryBars data={loggedOutcomes} label="Logged call outcomes" />
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-950">Open tasks by age</h2>
          <p className="mt-0.5 text-sm text-muted">How long workable tasks have been waiting.</p>
          <div className="mt-5">
            <CategoryBars data={aging} label="Open call tasks by age" />
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-950">Calls by hour</h2>
          <p className="mt-0.5 text-sm text-muted">Last 30 days, IST.</p>
          <div className="mt-5">
            <CategoryBars data={byHour} label="Calls logged by hour of day, IST" />
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-950">Imported over time</h2>
          <div className="mt-5">
            <TrendChart data={imported} id="call-task-trend" noun="call tasks" />
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-950">Calls logged over time</h2>
          <div className="mt-5">
            <TrendChart data={activity} id="call-activity-trend" noun="logged calls" />
          </div>
        </Card>
      </div>

      <Section title="Latest activity" sub="The last 40 things anyone did to a call task.">
        <WideTable minWidth={860}>
          <thead>
            <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
              <th className={TH}>When</th>
              <th className={TH}>Caller</th>
              <th className={TH}>Task</th>
              <th className={TH}>What happened</th>
              <th className={TH}>Note</th>
            </tr>
          </thead>
          <tbody>
            {feed.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  Nothing logged yet.
                </td>
              </tr>
            )}
            {feed.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-hairline last:border-b-0 hover:bg-paper"
              >
                <td className="whitespace-nowrap px-4 py-3 text-navy-500">
                  {when(entry.createdAt)}
                </td>
                <td className="px-4 py-3 text-navy-700">{entry.actorEmail ?? "—"}</td>
                <td className="px-4 py-3">
                  {entry.taskName ? (
                    <Link
                      href={`/crm/${entry.taskId}`}
                      className="font-medium text-navy-950 hover:text-red-600"
                    >
                      {entry.taskName}
                    </Link>
                  ) : (
                    <span className="text-muted">Deleted task</span>
                  )}
                  {entry.phone && <p className="text-xs tabular-nums text-muted">{entry.phone}</p>}
                </td>
                <td className="px-4 py-3 text-navy-700">{describe(entry.action, entry.status)}</td>
                <td className="max-w-[22rem] px-4 py-3 text-navy-600">
                  {entry.note ? <span title={entry.note}>{entry.note}</span> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </WideTable>
      </Section>
    </>
  );
}

/** Audit actions are machine strings; this is the only place they are shown to a human. */
function describe(action: string, status: string | null): string {
  switch (action) {
    case "call_task.status_update":
      return status
        ? `Marked ${(callStatusLabels[status] ?? status).toLowerCase()}`
        : "Outcome logged";
    case "call_task.convert":
      return "Converted to a lead";
    case "call_task.form_emailed":
      return "Emailed the enquiry form";
    case "call_task.assign":
      return "Imported and assigned";
    case "call_task.balance":
      return "Reassigned by balancing";
    default:
      return action;
  }
}
