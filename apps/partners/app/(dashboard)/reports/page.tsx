import { redirect } from "next/navigation";
import { BarChart3, CircleCheckBig, IndianRupee, TrendingUp } from "lucide-react";
import { Card, StatTile } from "@truelend/ui";
import { formatPaise, productName } from "@truelend/reference";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerMetrics, getProductPerformance } from "@/lib/dashboard-queries";

export const dynamic = "force-dynamic";

function percentage(value: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

export default async function ReportsPage() {
  const { partner } = await requirePartner();
  if (partner?.type !== "business") redirect("/dashboard");
  const { db } = getAuthContext();
  const [metrics, products] = await Promise.all([
    getPartnerMetrics(db, partner.userId),
    getProductPerformance(db, partner.userId),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PartnerPageHeader
        eyebrow="Business intelligence"
        title="Reports"
        description="A focused view of sourcing, approval, disbursal and product performance."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Customers sourced" value={metrics.totalLeads.toLocaleString("en-IN")} />
        <StatTile
          label="Approval rate"
          value={percentage(metrics.approved, metrics.totalLeads)}
          sub="Approved cases ÷ customers"
        />
        <StatTile
          label="Disbursal rate"
          value={percentage(metrics.disbursed, metrics.totalLeads)}
          sub="Disbursed cases ÷ customers"
        />
        <StatTile
          label="Disbursed volume"
          value={formatPaise(metrics.disbursedVolumePaise)}
          accent
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-hairline px-6 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sun-100 text-navy-800">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-navy-950">Product performance</h2>
              <p className="text-xs text-navy-500">All customers sourced by you</p>
            </div>
          </div>
          {products.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-navy-600">
              Product performance will appear after your first customer submission.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper-deep/70 text-xs uppercase tracking-[0.08em] text-muted">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 text-right font-semibold">Customers</th>
                    <th className="px-4 py-3 text-right font-semibold">Disbursed</th>
                    <th className="px-6 py-3 text-right font-semibold">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {products.map((product) => (
                    <tr key={product.productSlug ?? "unspecified"}>
                      <td className="px-6 py-4 font-semibold text-navy-950">
                        {productName(product.productSlug)}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-navy-700">
                        {product.leads.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-navy-700">
                        {product.disbursed.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold tabular-nums text-navy-950">
                        {formatPaise(product.volumePaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <TrendingUp className="h-6 w-6 text-red-600" aria-hidden />
            <h2 className="mt-3 font-display text-lg font-bold text-navy-950">Pipeline health</h2>
            <p className="mt-1 text-sm leading-relaxed text-navy-600">
              {metrics.activeLeads.toLocaleString("en-IN")} active customer
              {metrics.activeLeads === 1 ? " is" : "s are"} currently moving through the process.
            </p>
          </Card>
          <Card className="bg-navy-900 p-5 text-white">
            <IndianRupee className="h-6 w-6 text-sun-400" aria-hidden />
            <h2 className="mt-3 font-display text-lg font-bold">Commercial summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-on-dark-muted">Commission earned</span>
                <strong className="tabular-nums">{formatPaise(metrics.earnedPaise)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-on-dark-muted">Commission received</span>
                <strong className="tabular-nums">{formatPaise(metrics.paidPaise)}</strong>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <CircleCheckBig className="h-6 w-6 text-navy-700" aria-hidden />
            <h2 className="mt-3 font-display text-lg font-bold text-navy-950">Report definition</h2>
            <p className="mt-1 text-sm leading-relaxed text-navy-600">
              Figures reflect the latest statuses and ledger entries recorded by the TrueLend team.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const metadata = { title: "Reports" };
