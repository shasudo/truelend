import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Card, StatTile } from "@truelend/ui";
import { PageTitle } from "@/components/page-title";
import { CategoryBars, TrendChart } from "@/components/dashboard-charts";
import { getAuthContext, requireAdmin } from "@/lib/auth";
import {
  getCallQueueByCaller,
  getCallQueueStats,
  getCallTasksBySource,
  getCallTasksByStatus,
  getCallTasksOverTime,
} from "@/lib/crm-analytics-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Call Queue Analytics" };

/*
 * Operational analytics for the outbound queue — who is carrying what, who
 * converts, and which imported list was worth buying. Deliberately separate
 * from /mis, which reports money: mixing a caller leaderboard into a P&L makes
 * both harder to read, and this one is useful to look at daily.
 */
export default async function CallQueueAnalyticsPage() {
  await requireAdmin();
  const { db } = getAuthContext();
  const [stats, callers, byStatus, bySource, overTime] = await Promise.all([
    getCallQueueStats(db),
    getCallQueueByCaller(db),
    getCallTasksByStatus(db),
    getCallTasksBySource(db),
    getCallTasksOverTime(db),
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
        subtitle={`${stats.total} ${stats.total === 1 ? "task" : "tasks"} imported all time`}
      />

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Open" value={stats.open.toLocaleString("en-IN")} sub="Still workable" />
        <StatTile
          label="Unassigned"
          value={stats.unassigned.toLocaleString("en-IN")}
          sub="Nobody is calling these"
          accent={stats.unassigned > 0}
        />
        <StatTile
          label="Callbacks overdue"
          value={stats.callbacksOverdue.toLocaleString("en-IN")}
          sub="Promised and missed"
          accent={stats.callbacksOverdue > 0}
        />
        <StatTile label="Converted" value={stats.converted.toLocaleString("en-IN")} />
        <StatTile label="Conversion rate" value={`${stats.conversionRate}%`} sub="Of all tasks" />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-navy-950">By caller</h2>
        <Card className="max-w-full overscroll-x-contain overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
                <th className="px-5 py-3 font-semibold">Caller</th>
                <th className="px-5 py-3 text-right font-semibold">Open</th>
                <th className="px-5 py-3 text-right font-semibold">Callbacks due</th>
                <th className="px-5 py-3 text-right font-semibold">Converted</th>
                <th className="px-5 py-3 text-right font-semibold">Handled</th>
                <th className="px-5 py-3 text-right font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody>
              {callers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    No active callers yet.
                  </td>
                </tr>
              )}
              {callers.map((caller) => (
                <tr
                  key={caller.id}
                  className="border-b border-hairline last:border-b-0 hover:bg-paper"
                >
                  <td className="px-5 py-3.5 font-medium text-navy-950">
                    <Link
                      href={`/crm?assignee=${encodeURIComponent(caller.id)}`}
                      className="hover:text-red-600"
                    >
                      {caller.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                    {caller.open}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                    {caller.callbacksDue}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                    {caller.converted}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                    {caller.handled}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-950">
                    {caller.conversionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-navy-950">By source list</h2>
        <Card className="max-w-full overscroll-x-contain overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 text-right font-semibold">Tasks</th>
                <th className="px-5 py-3 text-right font-semibold">Converted</th>
                <th className="px-5 py-3 text-right font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody>
              {bySource.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-muted">
                    No call tasks imported yet.
                  </td>
                </tr>
              )}
              {bySource.map((row) => (
                <tr
                  key={row.source}
                  className="border-b border-hairline last:border-b-0 hover:bg-paper"
                >
                  <td className="px-5 py-3.5 font-medium text-navy-950">
                    <Link
                      href={`/crm?source=${encodeURIComponent(row.source)}`}
                      className="hover:text-red-600"
                    >
                      {row.source}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">{row.total}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                    {row.converted}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-950">
                    {row.conversionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-950">By outcome</h2>
          <div className="mt-5">
            <CategoryBars data={byStatus} label="Call task counts by outcome" />
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-950">Imported over time</h2>
          <div className="mt-5">
            <TrendChart data={overTime} id="call-task-trend" noun="call tasks" />
          </div>
        </Card>
      </div>
    </>
  );
}
