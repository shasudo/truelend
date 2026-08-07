import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@truelend/ui";
import { formatDate } from "@truelend/reference";
import { PageTitle } from "@/components/page-title";
import { BankLeadCsvImport } from "@/components/bank-lead-forms";
import { requireAdmin, getAuthContext } from "@/lib/auth";
import { listHdfcApplications } from "@/lib/hdfc-application-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "HDFC Applications" };

export default async function HdfcApplicationsPage() {
  await requireAdmin();
  const { db } = getAuthContext();
  const applications = await listHdfcApplications(db);

  return (
    <>
      <PageTitle
        title="Card Referrals"
        subtitle="HDFC's weekly MIS report — not linked to individual partner referrals"
      />

      <div className="mb-4 flex gap-2">
        <Link
          href="/bank-leads"
          className="rounded-lg border border-hairline px-3.5 py-1.5 text-sm font-medium text-navy-600 transition-colors hover:border-navy-800/40"
        >
          IndusInd
        </Link>
        <span className="rounded-lg bg-navy-800 px-3.5 py-1.5 text-sm font-medium text-white">
          HDFC
        </span>
      </div>

      <BankLeadCsvImport defaultBank="hdfc" />

      <Card className="max-w-full overscroll-x-contain overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">City / State</th>
              <th className="px-5 py-3 font-semibold">Stage</th>
              <th className="px-5 py-3 font-semibold">Decision</th>
              <th className="px-5 py-3 font-semibold">DSA code</th>
              <th className="px-5 py-3 font-semibold">Imported</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted">
                  No HDFC applications imported yet.
                </td>
              </tr>
            )}
            {applications.map((app) => (
              <tr key={app.id} className="border-b border-hairline last:border-b-0 hover:bg-paper">
                <td className="px-5 py-3.5 text-navy-950">{app.customerName ?? "—"}</td>
                <td className="px-5 py-3.5 text-navy-700">
                  {[app.city, app.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-5 py-3.5 text-navy-700">{app.currentStage ?? "—"}</td>
                <td className="px-5 py-3.5 text-navy-700">{app.finalDecision ?? "—"}</td>
                <td className="px-5 py-3.5 tabular-nums text-navy-500">{app.dsaCode ?? "—"}</td>
                <td className="px-5 py-3.5 tabular-nums text-navy-500">
                  {formatDate(app.importedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
