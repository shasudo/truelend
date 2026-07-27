import { Clock, XCircle, CheckCircle2 } from "lucide-react";
import { Card, Container, Logo } from "@truelend/ui";
import { evaluatePartnerApplication } from "@truelend/reference";
import type { Partner } from "@truelend/db";
import { SubmitForReviewForm } from "@/components/application-action-forms";
import { KycDetailsForm } from "@/components/kyc-details-form";
import { KycUpload } from "@/components/kyc-upload";
import { SignOutButton } from "@/components/sign-out-button";
import { toKycFormValues } from "@/lib/kyc-form-values";

export function PartnerStatusScreen({
  partner,
  name,
  documentTypes,
}: {
  partner: Partner;
  name: string;
  documentTypes: string[];
}) {
  const rejected = partner.status === "rejected";
  const complete = evaluatePartnerApplication(partner, new Set(documentTypes)).isComplete;
  return (
    <div className="min-h-screen min-w-0">
      <header className="border-b border-hairline bg-white">
        <Container className="flex h-16 items-center justify-between">
          <span className="text-navy-800">
            <Logo />
          </span>
          <SignOutButton />
        </Container>
      </header>

      <Container className="max-w-2xl py-12">
        <Card className={rejected ? "border-red-200 bg-red-50/50 p-5 sm:p-6" : "p-5 sm:p-6"}>
          <div className="flex items-start gap-4">
            {rejected ? (
              <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" aria-hidden />
            ) : (
              <Clock className="mt-0.5 h-6 w-6 shrink-0 text-navy-500" aria-hidden />
            )}
            <div>
              <h1 className="font-display text-xl font-extrabold tracking-tight text-navy-950">
                {rejected ? "Application not approved" : "Verification in progress"}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-navy-600">
                Hi {name.split(" ")[0]} — you registered as a <strong>Referral Partner</strong>.{" "}
                {rejected
                  ? "Please review the note below, correct your documents, and they'll be re-checked."
                  : "Upload your documents below; our team verifies Referral Partners within one working day."}
              </p>
              {rejected && partner.rejectionReason && (
                <p className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm text-red-700">
                  {partner.rejectionReason}
                </p>
              )}
            </div>
          </div>
        </Card>

        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-navy-950">
            <span className="mr-2 text-red-600">1.</span>Your details
          </h2>
          <p className="mb-4 mt-1 text-sm text-navy-500">
            PAN, address and bank details — so we can verify you and pay you.
          </p>
          <Card className="p-5 sm:p-6">
            <KycDetailsForm
              values={toKycFormValues(partner)}
              storageKey={`truelend:partner:kyc-details:${partner.userId}`}
            />
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-navy-950">
            <span className="mr-2 text-red-600">2.</span>Your documents
          </h2>
          <p className="mb-4 mt-1 text-sm text-navy-500">Upload proof for the details above.</p>
          <KycUpload uploadedDocumentTypes={documentTypes} />
        </div>

        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-navy-950">
            <span className="mr-2 text-red-600">3.</span>Submit for review
          </h2>
          <Card className="mt-4 p-5 sm:p-6">
            {complete ? (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm text-navy-700">
                  <CheckCircle2 className="h-5 w-5 text-navy-800" aria-hidden />
                  Everything looks complete. Submit and our team will review it.
                </p>
                <SubmitForReviewForm />
              </div>
            ) : (
              <p className="text-sm text-navy-500">
                Fill in all your details and upload the required documents (PAN, Aadhaar, photo and
                cancelled cheque) to submit your application.
              </p>
            )}
          </Card>
        </div>
      </Container>
    </div>
  );
}
