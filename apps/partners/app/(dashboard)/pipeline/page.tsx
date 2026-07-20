import Link from "next/link";
import { ArrowRight, CircleCheckBig, Clock3, FolderKanban, Handshake } from "lucide-react";
import { Button, Card, StatusBadge } from "@truelend/ui";
import {
  bankName,
  formatDate,
  formatPaise,
  leadStatusLabels,
  loanCaseStatusLabels,
  pipelineStatusTone,
  productName,
} from "@truelend/reference";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerCases, getPartnerLeadsPage, getPartnerMetrics } from "@/lib/dashboard-queries";

export const dynamic = "force-dynamic";

const caseStages = ["logged_in", "approved", "disbursed"] as const;

export default async function PipelinePage() {
  const { partner } = await requirePartner();
  const { db } = getAuthContext();
  const business = partner.type === "business";

  if (!business) {
    const referrals = await getPartnerLeadsPage(db, partner.userId, 1);
    return (
      <div className="mx-auto max-w-5xl">
        <PartnerPageHeader
          eyebrow="Simple tracking"
          title="Referral Status"
          description="See what is happening with each introduction. TrueLend manages the loan process for you."
          action={
            <Button asChild>
              <Link href="/refer">Refer Someone</Link>
            </Button>
          }
        />
        <div className="mt-6 space-y-3">
          {referrals.rows.length === 0 ? (
            <Card className="px-6 py-12 text-center">
              <Handshake className="mx-auto h-8 w-8 text-red-600" aria-hidden />
              <h2 className="mt-3 font-display text-lg font-bold text-navy-950">
                No referrals to track yet
              </h2>
              <p className="mt-1 text-sm text-navy-600">
                Make an introduction and its status will appear here.
              </p>
            </Card>
          ) : (
            referrals.rows.map((lead) => (
              <Card key={lead.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-navy-950">
                      {lead.name ?? "Referral"}
                    </h2>
                    <p className="mt-0.5 text-sm text-navy-500">
                      {productName(lead.productSlug)} · Referred {formatDate(lead.createdAt)}
                    </p>
                  </div>
                  <StatusBadge
                    tone={pipelineStatusTone(lead.status)}
                    label={leadStatusLabels[lead.status] ?? lead.status}
                  />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Referral progress">
                  {[
                    { label: "Referred", complete: true },
                    {
                      label: "In progress",
                      complete: !["new", "declined", "lost"].includes(lead.status),
                    },
                    { label: "Successful", complete: lead.status === "disbursed" },
                  ].map((step, index) => (
                    <div key={step.label}>
                      <div
                        className={`h-1.5 rounded-full ${step.complete ? "bg-red-600" : "bg-navy-100"}`}
                      />
                      <p className="mt-2 text-xs font-semibold text-navy-600">
                        {index + 1}. {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  const [cases, metrics] = await Promise.all([
    getPartnerCases(db, partner.userId),
    getPartnerMetrics(db, partner.userId),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PartnerPageHeader
        eyebrow="Case operations"
        title="Pipeline"
        description="Follow each logged-in loan case through approval and disbursal."
        action={
          <Button asChild>
            <Link href="/leads">Submit New Loan Case</Link>
          </Button>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {caseStages.map((status) => {
          const value =
            status === "logged_in"
              ? metrics.activeLeads
              : status === "approved"
                ? metrics.approved
                : metrics.disbursed;
          return (
            <Card key={status} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    {loanCaseStatusLabels[status]}
                  </p>
                  <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-navy-950">
                    {value.toLocaleString("en-IN")}
                  </p>
                </div>
                {status === "disbursed" ? (
                  <CircleCheckBig className="h-7 w-7 text-red-600" aria-hidden />
                ) : status === "approved" ? (
                  <Clock3 className="h-7 w-7 text-navy-700" aria-hidden />
                ) : (
                  <FolderKanban className="h-7 w-7 text-navy-500" aria-hidden />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-hairline px-6 py-4">
          <h2 className="font-display text-lg font-bold text-navy-950">Loan cases</h2>
          <p className="mt-0.5 text-xs text-navy-500">Latest 50 case updates</p>
        </div>
        {cases.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-semibold text-navy-950">No loan cases have been logged in yet.</p>
            <p className="mt-1 text-sm text-navy-600">
              Submitted customers appear here once the TrueLend team creates a lender case.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-paper-deep/70 text-xs uppercase tracking-[0.08em] text-muted">
                <tr>
                  <th className="px-6 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Lender</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-6 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {cases.map((loanCase) => (
                  <tr key={loanCase.id} className="hover:bg-navy-800/[0.025]">
                    <td className="px-6 py-4 font-semibold text-navy-950">{loanCase.leadName}</td>
                    <td className="px-4 py-4 text-navy-700">{productName(loanCase.productSlug)}</td>
                    <td className="px-4 py-4 text-navy-700">{bankName(loanCase.lenderSlug)}</td>
                    <td className="px-4 py-4 tabular-nums text-navy-700">
                      {formatPaise(
                        loanCase.status === "disbursed"
                          ? loanCase.disbursedAmountPaise
                          : loanCase.requestedAmountPaise,
                      )}
                    </td>
                    <td className="px-4 py-4 tabular-nums text-navy-600">
                      {formatDate(loanCase.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StatusBadge
                        tone={pipelineStatusTone(loanCase.status)}
                        label={loanCaseStatusLabels[loanCase.status] ?? loanCase.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link
          href="/customers"
          className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-4 text-sm font-semibold text-navy-700 hover:text-red-600"
        >
          View all customers <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Card>
    </div>
  );
}

export const metadata = { title: "Pipeline and referral status" };
