import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Check, X } from "lucide-react";
import { Card, Field, Input, Select, Textarea, Stat, SubmitButton, cx } from "@truelend/ui";
import {
  partnerTypeLabels,
  partnerStatusLabels,
  partnerDocTypeLabels,
  productName,
  earningsLabel,
  formatPaise,
  formatDate,
  formatDateTime,
} from "@truelend/reference";
import { PageTitle } from "@/components/page-title";
import { requireAdmin, getAuthContext } from "@/lib/auth";
import { getPartnerDetail } from "@/lib/partner-queries";
import {
  approvePartnerAction,
  rejectPartnerAction,
  revokePartnerAction,
  recordPayoutAction,
} from "@/lib/partner-actions";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  pending: "bg-navy-800/[0.08] text-navy-700",
  verified: "bg-navy-800 text-white",
  rejected: "bg-red-50 text-red-700",
};

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-navy-400">{label}</dt>
      <dd className="mt-0.5 text-navy-900">{value || "—"}</dd>
    </div>
  );
}

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { db } = getAuthContext();
  const data = await getPartnerDetail(db, id);
  if (!data) notFound();
  const { partner, name, email, documents, payouts, leads, earnedPaise, paidPaise } = data;
  const balance = earnedPaise - paidPaise;
  // "Payout" (business) / "Incentive" (referral) — inner labels echo the card.
  const noun = earningsLabel(partner.type);
  const canApprove = Boolean(partner.submittedAt) && documents.length > 0;

  return (
    <>
      <Link
        href="/partners"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to partners
      </Link>

      <PageTitle
        title={partner.businessName || name}
        subtitle={partnerTypeLabels[partner.type]}
        actions={
          <span
            className={cx(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
              statusStyles[partner.status],
            )}
          >
            {partnerStatusLabels[partner.status]}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Profile */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Profile</h2>
            <dl className="mt-5 grid grid-cols-2 gap-5">
              <Detail label="Contact name" value={name} />
              <Detail label="Email" value={email} />
              <Detail label="Phone" value={partner.phone} />
              <Detail label="Type" value={partnerTypeLabels[partner.type]} />
              {partner.businessName && <Detail label="Business" value={partner.businessName} />}
              <Detail label="Registered" value={formatDate(partner.createdAt)} />
              <Detail
                label="Submitted for review"
                value={
                  partner.submittedAt ? formatDateTime(partner.submittedAt) : "Not yet submitted"
                }
              />
            </dl>
          </Card>

          {/* KYC details */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">KYC details</h2>
            <dl className="mt-5 grid grid-cols-2 gap-5">
              <Detail label="PAN" value={partner.pan} />
              <Detail label="GST" value={partner.gst} />
              <Detail label="Address" value={partner.address} />
              <div />
              <Detail label="Account holder" value={partner.accountHolder} />
              <Detail label="Account number" value={partner.accountNumber} />
              <Detail label="IFSC" value={partner.ifsc} />
            </dl>
          </Card>

          {/* KYC documents */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">KYC documents</h2>
            <ul className="mt-4 space-y-2">
              {documents.length === 0 && (
                <li className="text-sm text-navy-400">No documents uploaded yet.</li>
              )}
              {documents.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={`/api/kyc/${doc.r2Key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg border border-hairline p-3 transition-colors hover:border-navy-800/30 hover:bg-paper"
                  >
                    <span className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-navy-500" aria-hidden />
                      <span className="font-medium text-navy-950">
                        {partnerDocTypeLabels[doc.docType] ?? doc.docType}
                      </span>
                    </span>
                    <span className="text-xs text-navy-400">{formatDateTime(doc.uploadedAt)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>

          {/* Recent leads */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Recent leads</h2>
            <ul className="mt-4 divide-y divide-hairline">
              {leads.length === 0 && <li className="py-3 text-sm text-navy-400">No leads yet.</li>}
              {leads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-4 py-2.5">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-navy-900 hover:text-red-600"
                  >
                    {lead.name ?? "—"}
                  </Link>
                  <span className="text-xs text-navy-400">{productName(lead.productSlug)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right: verification + payouts */}
        <div className="space-y-6">
          {partner.status !== "verified" && (
            <Card className="p-6">
              <h2 className="font-display text-lg font-bold text-navy-950">Verification</h2>
              <form action={approvePartnerAction} className="mt-4">
                <input type="hidden" name="partnerId" value={partner.userId} />
                <SubmitButton
                  className="w-full"
                  disabled={!canApprove}
                  pendingText="Approving…"
                  confirm={`Approve ${partner.businessName || name} and grant them portal access? They'll be emailed a confirmation.`}
                >
                  <Check className="h-4 w-4" aria-hidden /> Approve partner
                </SubmitButton>
                {!canApprove && (
                  <p className="mt-2 text-xs text-navy-400">
                    {!partner.submittedAt
                      ? "Partner hasn't submitted their application yet."
                      : "No documents uploaded."}
                  </p>
                )}
              </form>
              <form action={rejectPartnerAction} className="mt-3 space-y-2">
                <input type="hidden" name="partnerId" value={partner.userId} />
                <Textarea
                  name="reason"
                  required
                  maxLength={500}
                  placeholder="Reason (shown to the partner)"
                  className="min-h-16 text-sm"
                />
                <SubmitButton
                  variant="outline"
                  className="w-full text-red-700 hover:bg-red-50"
                  pendingText="Rejecting…"
                  confirm={`Reject ${partner.businessName || name} and email them this reason? This can't be undone.`}
                >
                  <X className="h-4 w-4" aria-hidden /> Reject
                </SubmitButton>
              </form>
            </Card>
          )}

          {partner.status === "verified" && (
            <Card className="p-6">
              <h2 className="font-display text-lg font-bold text-navy-950">Verification</h2>
              <p className="mt-2 text-sm text-navy-500">
                Verified — this partner has portal access.
              </p>
              <form action={revokePartnerAction} className="mt-4">
                <input type="hidden" name="partnerId" value={partner.userId} />
                <SubmitButton
                  variant="outline"
                  className="w-full"
                  pendingText="Revoking…"
                  confirm="Revoke verification and return this partner to pending? They'll lose portal access until re-approved."
                >
                  Revoke verification
                </SubmitButton>
              </form>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">{noun}s</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat value={formatPaise(earnedPaise)} label="Earned" />
              <Stat value={formatPaise(paidPaise)} label="Paid" />
              <Stat value={formatPaise(balance)} label="Balance" accent />
            </div>

            <form
              action={recordPayoutAction}
              className="mt-5 space-y-3 border-t border-hairline pt-5"
            >
              <input type="hidden" name="partnerId" value={partner.userId} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Entry" htmlFor="kind">
                  <Select id="kind" name="kind" defaultValue="earned">
                    <option value="earned">Earned</option>
                    <option value="paid">Paid</option>
                  </Select>
                </Field>
                <Field label="Amount (₹)" htmlFor="amount">
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    required
                    min="1"
                    step="1"
                    inputMode="numeric"
                    placeholder="0"
                  />
                </Field>
              </div>
              <Field label="Note" htmlFor="note">
                <Input id="note" name="note" placeholder="e.g. Case #… disbursed" />
              </Field>
              <SubmitButton
                size="sm"
                variant="secondary"
                className="w-full"
                pendingText="Recording…"
              >
                Record {noun.toLowerCase()}
              </SubmitButton>
            </form>

            {payouts.length === 0 ? (
              <p className="mt-5 border-t border-hairline pt-4 text-sm text-navy-400">
                No entries yet.
              </p>
            ) : (
              <ul className="mt-5 space-y-2 border-t border-hairline pt-4">
                {payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-navy-600">
                      <span
                        className={cx(
                          "mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold",
                          p.kind === "earned"
                            ? "bg-navy-800/[0.08] text-navy-700"
                            : "bg-red-50 text-red-700",
                        )}
                      >
                        {p.kind}
                      </span>
                      {p.note || "—"}
                    </span>
                    <span className="shrink-0 tabular-nums font-medium text-navy-950">
                      {formatPaise(p.amountPaise)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
