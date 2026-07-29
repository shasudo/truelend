import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, Stat } from "@truelend/ui";
import { bankName, productName, formatPaise, formatDateTime } from "@truelend/reference";
import { UpdateLoanCaseForm } from "@/components/loan-case-action-forms";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { getAuthContext } from "@/lib/auth";
import { getLoanCase } from "@/lib/loan-queries";
import { LoanCaseFields } from "@/components/loan-case-fields";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Loan case details" };

export default async function LoanCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = getAuthContext();
  const c = await getLoanCase(db, id);
  if (!c) notFound();

  const net =
    c.revenuePaise != null || c.payoutPaise != null
      ? (c.revenuePaise ?? 0) - (c.payoutPaise ?? 0)
      : null;

  const timeline = [
    { label: "Logged in", at: c.loggedInAt },
    { label: "Approved", at: c.approvedAt },
    { label: "Declined", at: c.declinedAt },
    { label: "Disbursed", at: c.disbursedAt },
  ].filter((t) => t.at);

  return (
    <>
      <Link
        href={`/leads/${c.leadId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {c.leadName ?? "lead"}
      </Link>

      <PageTitle
        title={`${bankName(c.lenderSlug)} · ${productName(c.productSlug)}`}
        subtitle={c.leadName ?? undefined}
        actions={<StatusBadge status={c.status} kind="case" />}
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-8">
          <h2 className="mb-6 font-display text-lg font-bold text-navy-950">Edit case</h2>
          <UpdateLoanCaseForm caseId={c.id}>
            <LoanCaseFields defaults={c} />
          </UpdateLoanCaseForm>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Commercials</h2>
            <div className="mt-5 space-y-5">
              <Stat value={formatPaise(c.disbursedAmountPaise)} label="Disbursed" />
              <div className="grid grid-cols-1 gap-5 border-t border-hairline pt-5 min-[420px]:grid-cols-2">
                <Stat value={formatPaise(c.revenuePaise)} label="Revenue" />
                <Stat value={formatPaise(c.payoutPaise)} label="Payout" />
              </div>
              <div className="border-t border-hairline pt-5">
                <Stat value={formatPaise(net)} label="Net to TrueLend" accent />
              </div>
            </div>
          </Card>

          {timeline.length > 0 && (
            <Card className="p-5 sm:p-6">
              <h2 className="font-display text-lg font-bold text-navy-950">Timeline</h2>
              <ul className="mt-4 space-y-3">
                {timeline.map((t) => (
                  <li
                    key={t.label}
                    className="flex flex-col justify-between gap-0.5 text-sm min-[420px]:flex-row min-[420px]:gap-3"
                  >
                    <span className="text-navy-600">{t.label}</span>
                    <span className="break-words tabular-nums text-navy-500">
                      {formatDateTime(t.at!)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
