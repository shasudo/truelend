import Link from "next/link";
import { desc } from "drizzle-orm";
import { Card, SectionHeading, StatTile } from "@truelend/ui";
import { productName, leadKindLabels, formatPaise, formatDate } from "@truelend/reference";
import { schema } from "@truelend/db";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { TrendChart, CategoryBars } from "@/components/dashboard-charts";
import { requireStaff, getAuthContext } from "@/lib/auth";
import {
  getOverviewStats,
  getLeadsOverTime,
  getLeadsByProduct,
  getLeadsByChannel,
} from "@/lib/mis-queries";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await requireStaff();
  const { db } = getAuthContext();

  const [stats, overTime, byProduct, byChannel, recent] = await Promise.all([
    getOverviewStats(db),
    getLeadsOverTime(db),
    getLeadsByProduct(db),
    getLeadsByChannel(db),
    db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt)).limit(5),
  ]);

  return (
    <>
      <PageTitle title={`Welcome back, ${session.user.name.split(" ")[0]}`} subtitle="Overview" />

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Total leads" value={stats.totalLeads.toLocaleString("en-IN")} />
        <StatTile label="In pipeline" value={stats.inPipeline.toLocaleString("en-IN")} />
        <StatTile label="Disbursed cases" value={stats.disbursedCases.toLocaleString("en-IN")} />
        <StatTile label="Disbursed volume" value={formatPaise(stats.disbursedVolumePaise)} />
        <StatTile label="Net to TrueLend" value={formatPaise(stats.netPaise)} accent />
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <SectionHeading eyebrow="Last 30 days" title="Leads over time" />
        <div className="mt-6">
          <TrendChart data={overTime} />
        </div>
      </Card>

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
export const metadata = { title: "Overview" };
