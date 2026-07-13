import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, Card, Stat } from "@truelend/ui";
import { bankName, productName } from "@truelend/reference";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { getAuthContext } from "@/lib/auth";
import { getLoanCase } from "@/lib/loan-queries";
import { updateLoanCaseAction } from "@/lib/loan-actions";
import { LoanCaseFields } from "@/components/loan-case-fields";
import { formatPaise, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

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

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6 sm:p-8">
          <h2 className="mb-6 font-display text-lg font-bold text-navy-950">Edit case</h2>
          <form action={updateLoanCaseAction} className="space-y-6">
            <input type="hidden" name="caseId" value={c.id} />
            <LoanCaseFields defaults={c} />
            <div className="border-t border-hairline pt-6">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Commercials</h2>
            <div className="mt-5 space-y-5">
              <Stat value={formatPaise(c.disbursedAmountPaise)} label="Disbursed" />
              <div className="grid grid-cols-2 gap-5 border-t border-hairline pt-5">
                <Stat value={formatPaise(c.revenuePaise)} label="Revenue" />
                <Stat value={formatPaise(c.payoutPaise)} label="Payout" />
              </div>
              <div className="border-t border-hairline pt-5">
                <Stat value={formatPaise(net)} label="Net to TrueLend" accent />
              </div>
            </div>
          </Card>

          {timeline.length > 0 && (
            <Card className="p-6">
              <h2 className="font-display text-lg font-bold text-navy-950">Timeline</h2>
              <ul className="mt-4 space-y-3">
                {timeline.map((t) => (
                  <li key={t.label} className="flex justify-between text-sm">
                    <span className="text-navy-600">{t.label}</span>
                    <span className="tabular-nums text-navy-500">{formatDateTime(t.at!)}</span>
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
