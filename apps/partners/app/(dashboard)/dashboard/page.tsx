import Link from "next/link";
import { Card, StatTile } from "@truelend/ui";
import { earningsLabel, productName, leadStatusLabels } from "@truelend/reference";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerMetrics, getPartnerLeads } from "@/lib/dashboard-queries";

export const dynamic = "force-dynamic";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const rupees = (paise: number) => inr.format(Math.round(paise / 100));
const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function DashboardPage() {
  const { session, partner } = await requirePartner();
  const { db } = getAuthContext();
  const partnerId = partner!.userId;
  const label = earningsLabel(partner!.type);

  const [m, leads] = await Promise.all([
    getPartnerMetrics(db, partnerId),
    getPartnerLeads(db, partnerId),
  ]);
  const balance = m.earnedPaise - m.paidPaise;
  const submitHref = partner!.type === "business" ? "/leads" : "/refer";

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">
            Welcome, {session.user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-navy-500">Your performance at a glance.</p>
        </div>
        <Link
          href={submitHref}
          className="inline-flex h-11 items-center rounded-lg bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          {partner!.type === "business" ? "Submit a lead" : "Refer a friend"}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Leads submitted" value={m.totalLeads.toLocaleString("en-IN")} />
        <StatTile label="Approved" value={m.approved.toLocaleString("en-IN")} />
        <StatTile label="Disbursed" value={m.disbursed.toLocaleString("en-IN")} />
        <StatTile label="Disbursed volume" value={rupees(m.disbursedVolumePaise)} />
        <StatTile label={`${label} earned`} value={rupees(m.earnedPaise)} />
        <StatTile label={`${label} received`} value={rupees(m.paidPaise)} accent />
      </div>

      <Card className="mt-6 flex items-center justify-between p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-navy-400">
            {label} balance (earned − received)
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-navy-950">
            {rupees(balance)}
          </p>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-bold text-navy-950">Your recent leads</h2>
        <ul className="mt-4 divide-y divide-hairline">
          {leads.length === 0 && (
            <li className="py-4 text-sm text-navy-400">
              No leads yet —{" "}
              <Link href={submitHref} className="font-semibold text-red-600">
                submit your first
              </Link>
              .
            </li>
          )}
          {leads.map((lead) => (
            <li key={lead.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy-950">{lead.name ?? "—"}</p>
                <p className="truncate text-xs text-navy-500">{productName(lead.productSlug)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="rounded-full bg-navy-800/[0.07] px-2.5 py-0.5 text-xs font-semibold text-navy-700">
                  {leadStatusLabels[lead.status]}
                </span>
                <span className="w-20 text-right text-xs tabular-nums text-navy-400">
                  {dateFmt.format(lead.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
