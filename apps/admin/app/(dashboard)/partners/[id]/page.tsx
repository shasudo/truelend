import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Check, X } from "lucide-react";
import { Card, Field, Textarea, Stat, SubmitButton, cx } from "@truelend/ui";
import {
  evaluatePartnerApplication,
  partnerStatusLabel,
  partnerDocTypeLabels,
  productName,
  formatPaise,
  formatDate,
  formatDateTime,
  referralTypeLabel,
  type PartnerApplicationEvaluation,
  type PartnerReviewState,
} from "@truelend/reference";
import { PageTitle } from "@/components/page-title";
import { PayoutForm } from "@/components/payout-form";
import { PartnerDetailsForm } from "@/components/partner-details-form";
import { PartnerDocumentUpload } from "@/components/partner-document-upload";
import { requireAdmin, getAuthContext } from "@/lib/auth";
import { getPartnerDetail } from "@/lib/partner-queries";
import {
  approvePartnerAction,
  rejectPartnerAction,
  revokePartnerAction,
} from "@/lib/partner-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Referral Partner details" };

const statusStyles: Record<string, string> = {
  pending: "bg-navy-800/[0.08] text-navy-700",
  verified: "bg-navy-800 text-white",
  rejected: "bg-red-50 text-red-700",
};

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="mt-0.5 text-navy-900">{value || "—"}</dd>
    </div>
  );
}

function getApprovalBlockedMessage(
  reviewState: PartnerReviewState,
  application: PartnerApplicationEvaluation,
): string | null {
  if (application.canApprove) return null;
  if (reviewState.status === "rejected") {
    return "The Referral Partner must correct and resubmit their application before approval.";
  }
  if (!reviewState.submittedAt) {
    return "The Referral Partner hasn't submitted their application yet.";
  }
  if (application.missingFields.length > 0) {
    return "Required KYC and bank details are incomplete.";
  }
  if (application.missingDocumentTypes.length > 0) {
    const documents = application.missingDocumentTypes.map(
      (documentType) => partnerDocTypeLabels[documentType],
    );
    return `Missing: ${documents.join(", ")}.`;
  }
  return "This application isn't eligible for approval in its current state.";
}

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { db } = getAuthContext();
  const data = await getPartnerDetail(db, id);
  if (!data) notFound();
  const { partner, name, email, documents, payouts, leads, earnedPaise, paidPaise } = data;
  const balance = earnedPaise - paidPaise;
  const noun = "Incentive";
  const uploadedDocTypes = new Set<string>(documents.map((document) => document.docType));
  const application = evaluatePartnerApplication(partner, uploadedDocTypes);
  const { canApprove } = application;
  const approvalBlockedMessage = getApprovalBlockedMessage(partner, application);

  return (
    <>
      <Link
        href="/partners"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Referral Partners
      </Link>

      <PageTitle
        title={name}
        subtitle="Referral Partner"
        actions={
          <span
            className={cx(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
              statusStyles[partner.status],
            )}
          >
            {partnerStatusLabel(partner.status)}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Profile</h2>
            <dl className="mt-5 grid grid-cols-2 gap-5">
              <Detail label="Contact name" value={name} />
              <Detail label="Email" value={email} />
              <Detail label="Phone" value={partner.phone} />
              <Detail label="Program" value="Referral Partner" />
              <Detail label="Referral type" value={referralTypeLabel(partner.referralType)} />
              <Detail label="City" value={partner.city} />
              <Detail
                label="Date of birth"
                value={
                  partner.dateOfBirth
                    ? formatDate(new Date(`${partner.dateOfBirth}T00:00:00Z`))
                    : null
                }
              />
              <Detail label="Registered" value={formatDate(partner.createdAt)} />
              <Detail
                label="Submitted for review"
                value={
                  partner.submittedAt ? formatDateTime(partner.submittedAt) : "Not yet submitted"
                }
              />
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Referral profile</h2>
            <dl className="mt-5 grid grid-cols-2 gap-5">
              <Detail label="Occupation" value={partner.occupation} />
              <Detail label="Designation" value={partner.designation} />
              <Detail label="Experience" value={partner.experienceNote} />
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">KYC details</h2>
            <dl className="mt-5 grid grid-cols-2 gap-5">
              <Detail label="PAN" value={partner.pan} />
              <Detail label="Current address" value={partner.address} />
              <Detail label="Bank name" value={partner.bankName} />
              <Detail label="Account holder" value={partner.accountHolder} />
              <Detail label="Account number" value={partner.accountNumber} />
              <Detail label="Branch" value={partner.bankBranch} />
              <Detail label="IFSC" value={partner.ifsc} />
            </dl>
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              Nominee
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-5">
              <Detail label="Name" value={partner.nomineeName} />
              <Detail label="Aadhaar" value={partner.nomineeAadhaar} />
              <Detail label="Mobile" value={partner.nomineePhone} />
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">KYC documents</h2>
            <ul className="mt-4 space-y-2">
              {documents.length === 0 && (
                <li className="text-sm text-muted">No documents uploaded yet.</li>
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
                        {partnerDocTypeLabels[doc.docType]}
                      </span>
                    </span>
                    <span className="text-xs text-muted">{formatDateTime(doc.uploadedAt)}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-hairline pt-5">
              <h3 className="font-display text-base font-bold text-navy-950">Upload documents</h3>
              <p className="mt-1 text-sm text-muted">
                Replacing a verified partner’s document returns their application to review.
              </p>
              <div className="mt-4">
                <PartnerDocumentUpload
                  partnerId={partner.userId}
                  uploadedDocumentTypes={documents.map((document) => document.docType)}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Recent leads</h2>
            <ul className="mt-4 divide-y divide-hairline">
              {leads.length === 0 && <li className="py-3 text-sm text-muted">No leads yet.</li>}
              {leads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-4 py-2.5">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-navy-900 hover:text-red-600"
                  >
                    {lead.name ?? "—"}
                  </Link>
                  <span className="text-xs text-muted">{productName(lead.productSlug)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Edit partner details</h2>
            <p className="mt-2 text-sm text-muted">
              Update the Referral Partner’s profile, KYC, and payout information.
            </p>
            <div className="mt-5">
              <PartnerDetailsForm partner={partner} />
            </div>
          </Card>

          {partner.status !== "verified" && (
            <Card className="p-6">
              <h2 className="font-display text-lg font-bold text-navy-950">Verification</h2>
              <form action={approvePartnerAction} className="mt-4">
                <input type="hidden" name="partnerId" value={partner.userId} />
                <SubmitButton
                  className="w-full"
                  disabled={!canApprove}
                  pendingText="Approving…"
                  confirm={`Approve ${name} as a Referral Partner and grant portal access? They'll be emailed a confirmation.`}
                >
                  <Check className="h-4 w-4" aria-hidden /> Approve Referral Partner
                </SubmitButton>
                {approvalBlockedMessage && (
                  <p className="mt-2 text-xs text-muted">{approvalBlockedMessage}</p>
                )}
              </form>
              <form action={rejectPartnerAction} className="mt-3 space-y-2">
                <input type="hidden" name="partnerId" value={partner.userId} />
                <Field label="Rejection reason" htmlFor="rejection-reason" required>
                  <Textarea
                    id="rejection-reason"
                    name="reason"
                    required
                    maxLength={500}
                    placeholder="Shown to the Referral Partner"
                    className="min-h-16 text-sm"
                  />
                </Field>
                <SubmitButton
                  variant="outline"
                  className="w-full text-red-700 hover:bg-red-50"
                  pendingText="Rejecting…"
                  confirm={`Reject ${name}'s Referral Partner application and email them this reason? This can't be undone.`}
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
                Verified — this Referral Partner has portal access.
              </p>
              <form action={revokePartnerAction} className="mt-4">
                <input type="hidden" name="partnerId" value={partner.userId} />
                <SubmitButton
                  variant="outline"
                  className="w-full"
                  pendingText="Revoking…"
                  confirm="Revoke verification and return this Referral Partner to pending? They'll lose portal access until re-approved."
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

            <PayoutForm partnerId={partner.userId} noun={noun} />

            {payouts.length === 0 ? (
              <p className="mt-5 border-t border-hairline pt-4 text-sm text-muted">
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
