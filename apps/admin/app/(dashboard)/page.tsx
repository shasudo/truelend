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
import { resolveRange } from "@/lib/date-range";
import { RangePicker } from "@/components/range-picker";
import {
  getActivityStats,
  getMyActivityStats,
  getPipelineStats,
  getMyPipelineStats,
  getLeadsOverTime,
  getLeadsByProduct,
  getLeadsByChannel,
} from "@/lib/mis-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview" };

type SP = Record<string, string | string[] | undefined>;

const n = (value: number) => value.toLocaleString("en-IN");

function str(sp: SP, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

interface PipelineTileProps {
  href: string;
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
}

/** A backlog number and the filtered queue it stands for, so one is never read without the other. */
function PipelineTile({ href, label, value, sub, accent }: PipelineTileProps) {
  return (
    <Link
      href={href}
      className="rounded-xl transition-colors hover:[&>div]:border-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
    >
      <StatTile label={label} value={n(value)} sub={sub} accent={accent} />
    </Link>
  );
}

interface SectionProps {
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}

function Section({ eyebrow, title, sub, children }: SectionProps) {
  return (
    <section className="mt-8 first:mt-0">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <p className="mt-1 text-sm text-muted">{sub}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const session = await requireStaff();
  const scopeUserId = scopeFor(session);
  const isAdmin = scopeUserId === null;
  const { db } = getAuthContext();
  const range = resolveRange({ range: str(sp, "range"), from: str(sp, "from"), to: str(sp, "to") });

  /*
   * Revenue and the company-wide breakdowns are an admin view; an employee gets
   * the same two sections scoped to their own book, and the unscoped aggregates
   * are not even queried for them.
   */
  const [activity, pipeline, overTime, byProduct, byChannel, recent] = await Promise.all([
    scopeUserId
      ? getMyActivityStats(db, range.from, range.to, scopeUserId)
      : getActivityStats(db, range.from, range.to),
    scopeUserId ? getMyPipelineStats(db, scopeUserId) : getPipelineStats(db),
    isAdmin ? getLeadsOverTime(db, range.from, range.to) : null,
    isAdmin ? getLeadsByProduct(db, range.from, range.to) : null,
    isAdmin ? getLeadsByChannel(db, range.from, range.to) : null,
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

      <RangePicker range={range} basePath="/" />

      <Section
        eyebrow={range.label}
        title="Activity"
        sub={isAdmin ? "What happened during this period." : "What you did during this period."}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          <StatTile label="New leads" value={n(activity.newLeads)} />
          <StatTile
            label="Calls made"
            value={n(activity.callsMade)}
            sub={`${n(activity.contacted)} prospects reached`}
          />
          <StatTile label="Interested" value={n(activity.interested)} />
          <StatTile label="Applications" value={n(activity.applications)} />
          <StatTile label="Approvals" value={n(activity.approvals)} />
          <StatTile label="Disbursed" value={n(activity.disbursed)} />
          <StatTile label="Disbursed volume" value={formatPaise(activity.disbursedVolumePaise)} />
          {/* Null, not zero, for an employee — the tile is absent rather than lying. */}
          {activity.netPaise !== null && (
            <StatTile label="Revenue" value={formatPaise(activity.netPaise)} accent />
          )}
        </div>
      </Section>

      {/*
       * Deliberately not affected by the range picker above: a backlog is a
       * standing quantity, and a "today" filter over it would report near zero
       * and read as an empty pipeline. Each tile links to the queue it counts,
       * so a number is one click from the rows behind it.
       */}
      <Section
        eyebrow="Right now"
        title="Pipeline"
        sub="What is waiting to be worked, regardless of period."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <PipelineTile
            href="/crm?status=new&sort=oldest"
            label="Uncontacted"
            value={pipeline.uncontacted}
          />
          <PipelineTile
            href="/crm?callback=scheduled&sort=callback"
            label="Follow-ups"
            value={pipeline.followUps}
            sub={
              pipeline.followUpsOverdue > 0 ? `${n(pipeline.followUpsOverdue)} overdue` : undefined
            }
            accent={pipeline.followUpsOverdue > 0}
          />
          <PipelineTile
            href="/crm?status=interested_any"
            label="Interested"
            value={pipeline.interested}
          />
          <PipelineTile
            href="/leads?status=qualified"
            label="Docs pending"
            value={pipeline.docsPending}
          />
          <PipelineTile
            href="/loan-cases?status=logged_in"
            label="Applications pending"
            value={pipeline.applicationsPending}
          />
          <PipelineTile
            href="/loan-cases?status=approved"
            label="Awaiting disbursement"
            value={pipeline.awaitingDisbursement}
          />
        </div>
      </Section>

      {overTime && (
        <Card className="mt-8 p-5 sm:p-6">
          <SectionHeading eyebrow={range.label} title="Leads over time" />
          <div className="mt-6">
            <TrendChart data={overTime} period={range.label.toLowerCase()} />
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
