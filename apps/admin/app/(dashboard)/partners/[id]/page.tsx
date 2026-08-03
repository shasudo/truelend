import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, Stat, cx } from "@truelend/ui";
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
import { PartnerReviewActions } from "@/components/partner-review-actions";
import { requireAdmin, getAuthContext } from "@/lib/auth";
import { getPartnerDetail } from "@/lib/partner-queries";
import { partnerRejectionRefusal } from "@/lib/partner-review-policy";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Referral Partner details" };

const statusStyles: Record<string, string> = {
  pending: "bg-navy-800/[0.08] text-navy-700",
  verified: "bg-navy-800 text-white",
  rejected: "bg-red-50 text-red-700",
};

interface DetailProps {
  label: string;
  value: string | null | undefined;
}

function Detail({ label, value }: DetailProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-navy-900">{value || "—"}</dd>
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
  const photoDocument = documents.find(
    (document) => document.docType === "photo" && document.contentType.startsWith("image/"),
  );
  const application = evaluatePartnerApplication(partner, uploadedDocTypes);
  const { canApprove } = application;
  const approvalBlockedMessage = getApprovalBlockedMessage(partner, application);
  const rejectionBlockedMessage = partnerRejectionRefusal(partner);

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
        subtitle={`Referral Partner · ${partner.referenceId}`}
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

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-4">
              {photoDocument && (
                <a
                  href={`/api/kyc/${photoDocument.r2Key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  {/* Authenticated, dynamic R2-backed route — not eligible for next/image optimization. */}
                  <img
                    src={`/api/kyc/${photoDocument.r2Key}`}
                    alt={`${name}'s profile photo`}
                    className="h-16 w-16 rounded-full border border-hairline object-cover"
                  />
                </a>
              )}
              <h2 className="font-display text-lg font-bold text-navy-950">Profile</h2>
            </div>
            <dl className="mt-5 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2">
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

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Referral profile</h2>
            <dl className="mt-5 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2">
              <Detail label="Occupation" value={partner.occupation} />
              <Detail label="Designation" value={partner.designation} />
              <Detail label="Experience" value={partner.experienceNote} />
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">KYC details</h2>
            <dl className="mt-5 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2">
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
            <dl className="mt-3 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2">
              <Detail label="Name" value={partner.nomineeName} />
              <Detail label="Aadhaar" value={partner.nomineeAadhaar} />
              <Detail label="Mobile" value={partner.nomineePhone} />
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
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
                    className="flex flex-col items-start justify-between gap-2 rounded-lg border border-hairline p-3 transition-colors hover:border-navy-800/30 hover:bg-paper min-[480px]:flex-row min-[480px]:items-center min-[480px]:gap-3"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <FileText className="h-5 w-5 shrink-0 text-navy-500" aria-hidden />
                      <span className="break-words font-medium text-navy-950">
                        {partnerDocTypeLabels[doc.docType]}
                      </span>
                    </span>
                    <span className="break-words text-xs text-muted">
                      {formatDateTime(doc.uploadedAt)}
                    </span>
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

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Recent leads</h2>
            <ul className="mt-4 divide-y divide-hairline">
              {leads.length === 0 && <li className="py-3 text-sm text-muted">No leads yet.</li>}
              {leads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex flex-col items-start justify-between gap-1 py-2.5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-4"
                >
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-navy-900 hover:text-red-600"
                  >
                    {lead.name ?? "—"}
                  </Link>
                  <span className="break-words text-xs text-muted">
                    {productName(lead.productSlug)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Edit partner details</h2>
            <p className="mt-2 text-sm text-muted">
              Update the Referral Partner’s profile, KYC, and payout information.
            </p>
            <div className="mt-5">
              <PartnerDetailsForm partner={partner} />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">Verification</h2>
            <PartnerReviewActions
              partnerId={partner.userId}
              partnerName={name}
              verified={partner.status === "verified"}
              canApprove={canApprove}
              approvalBlockedMessage={approvalBlockedMessage}
              canReject={rejectionBlockedMessage === null}
              rejectionBlockedMessage={rejectionBlockedMessage}
            />
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold text-navy-950">{noun}s</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
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
                  <li
                    key={p.id}
                    className="flex flex-col items-start justify-between gap-1.5 text-sm min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-3"
                  >
                    <span className="min-w-0 break-words text-navy-600">
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
