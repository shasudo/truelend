import Link from "next/link";
import type { Metadata } from "next";
import { and, desc } from "drizzle-orm";
import { Card, SectionHeading, StatTile } from "@truelend/ui";
import { productName, leadKindLabels, formatPaise, formatDate } from "@truelend/reference";
import { schema } from "@truelend/db";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { TrendChart, CategoryBars } from "@/components/dashboard-charts";
import { requireStaff, getAuthContext, scopeFor } from "@/lib/auth";
import { ownRow } from "@/lib/query-filters";
import {
  getOverviewStats,
  getEmployeeOverviewStats,
  getLeadsOverTime,
  getLeadsByProduct,
  getLeadsByChannel,
} from "@/lib/mis-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const session = await requireStaff();
  const scopeUserId = scopeFor(session);
  const isAdmin = scopeUserId === null;
  const { db } = getAuthContext();

  // Revenue, company-wide totals and the company-wide charts are all an admin
  // view. An employee, who can now only see their own leads, gets their own
  // numbers instead — and the unscoped aggregates are not even queried for them.
  const [stats, mine, overTime, byProduct, byChannel, recent] = await Promise.all([
    isAdmin ? getOverviewStats(db) : null,
    scopeUserId ? getEmployeeOverviewStats(db, scopeUserId) : null,
    isAdmin ? getLeadsOverTime(db) : null,
    isAdmin ? getLeadsByProduct(db) : null,
    isAdmin ? getLeadsByChannel(db) : null,
    db
      .select()
      .from(schema.leads)
      .where(and(ownRow(schema.leads.assignedTo, scopeUserId)))
      .orderBy(desc(schema.leads.createdAt))
      .limit(5),
  ]);

  return (
    <>
      <PageTitle title={`Welcome back, ${session.user.name.split(" ")[0]}`} subtitle="Overview" />

      {stats && (
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
          <StatTile label="Total leads" value={stats.totalLeads.toLocaleString("en-IN")} />
          <StatTile label="In pipeline" value={stats.inPipeline.toLocaleString("en-IN")} />
          <StatTile label="Disbursed cases" value={stats.disbursedCases.toLocaleString("en-IN")} />
          <StatTile label="Disbursed volume" value={formatPaise(stats.disbursedVolumePaise)} />
          <StatTile label="Net to TrueLend" value={formatPaise(stats.netPaise)} accent />
        </div>
      )}

      {mine && (
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
          <StatTile label="My leads" value={mine.myLeads.toLocaleString("en-IN")} />
          <StatTile label="My open pipeline" value={mine.myOpenLeads.toLocaleString("en-IN")} />
          <StatTile label="My call queue" value={mine.myCallTasks.toLocaleString("en-IN")} />
          <StatTile
            label="Callbacks due"
            value={mine.myCallbacksDue.toLocaleString("en-IN")}
            accent={mine.myCallbacksDue > 0}
          />
          <StatTile label="My conversions" value={mine.myConversions.toLocaleString("en-IN")} />
        </div>
      )}

      {overTime && (
        <Card className="mt-6 p-5 sm:p-6">
          <SectionHeading eyebrow="Last 30 days" title="Leads over time" />
          <div className="mt-6">
            <TrendChart data={overTime} />
          </div>
        </Card>
      )}

      {byProduct && byChannel && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Leads by product</h2>
            <div className="mt-4">
              <CategoryBars data={byProduct} />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Leads by channel</h2>
            <div className="mt-4">
              <CategoryBars data={byChannel} />
            </div>
          </Card>
        </div>
      )}

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-navy-950">Recent leads</h2>
          <Link href="/leads" className="text-sm font-semibold text-red-600 hover:text-red-700">
            View all
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-hairline">
          {recent.length === 0 && <li className="py-4 text-sm text-muted">No leads yet.</li>}
          {recent.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/leads/${lead.id}`}
                className="flex flex-col items-start justify-between gap-2 py-3 hover:text-red-600 min-[480px]:flex-row min-[480px]:items-center min-[480px]:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy-950">{lead.name ?? "—"}</p>
                  <p className="truncate text-xs text-navy-500">
                    {leadKindLabels[lead.kind]} · {productName(lead.productSlug)}
                  </p>
                </div>
                <div className="flex w-full flex-wrap items-center justify-between gap-3 min-[480px]:w-auto min-[480px]:shrink-0 min-[480px]:justify-start min-[480px]:gap-4">
                  <StatusBadge status={lead.status} />
                  <span className="text-right text-xs tabular-nums text-muted min-[480px]:w-20">
                    {formatDate(lead.createdAt)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
