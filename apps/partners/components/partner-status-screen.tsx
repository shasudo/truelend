import { Clock, XCircle } from "lucide-react";
import { Card, Container, Logo } from "@truelend/ui";
import { partnerTypeLabels } from "@truelend/reference";
import type { Partner, PartnerDocument } from "@truelend/db";
import { KycDetailsForm } from "@/components/kyc-details-form";
import { KycUpload } from "@/components/kyc-upload";
import { SignOutButton } from "@/components/sign-out-button";

// Shown by the dashboard layout until a partner is verified. Pending partners
// upload their KYC here; rejected partners see the reason and can re-upload.
export function PartnerStatusScreen({
  partner,
  name,
  documents,
}: {
  partner: Partner;
  name: string;
  documents: PartnerDocument[];
}) {
  const rejected = partner.status === "rejected";
  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline bg-white">
        <Container className="flex h-16 items-center justify-between">
          <span className="text-navy-800">
            <Logo />
          </span>
          <SignOutButton />
        </Container>
      </header>

      <Container className="max-w-2xl py-12">
        <Card className={rejected ? "border-red-200 bg-red-50/50 p-6" : "p-6"}>
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
                Hi {name.split(" ")[0]} — you registered as a{" "}
                <strong>{partnerTypeLabels[partner.type]}</strong>.{" "}
                {rejected
                  ? "Please review the note below, correct your documents, and they'll be re-checked."
                  : "Upload your documents below; our team verifies partners within one working day."}
              </p>
              {rejected && partner.rejectionReason && (
                <p className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm text-red-700">
                  {partner.rejectionReason}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Step 1: KYC details */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-navy-950">
            <span className="mr-2 text-red-600">1.</span>Your details
          </h2>
          <p className="mb-4 mt-1 text-sm text-navy-500">
            PAN, address and bank details — so we can verify you and pay you.
          </p>
          <Card className="p-6">
            <KycDetailsForm partner={partner} />
          </Card>
        </div>

        {/* Step 2: documents */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-navy-950">
            <span className="mr-2 text-red-600">2.</span>Your documents
          </h2>
          <p className="mb-4 mt-1 text-sm text-navy-500">Upload proof for the details above.</p>
          <KycUpload documents={documents} />
        </div>
      </Container>
    </div>
  );
}
