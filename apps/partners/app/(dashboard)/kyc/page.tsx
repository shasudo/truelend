import type { Metadata } from "next";
import { Card } from "@truelend/ui";
import { isKycEditable } from "@truelend/reference";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerDocumentTypes } from "@/lib/kyc-document-queries";
import { toKycFormValues } from "@/lib/kyc-form-values";
import { KycDetailsForm } from "@/components/kyc-details-form";
import { KycUpload } from "@/components/kyc-upload";
import { PartnerPageHeader } from "@/components/partner-page-header";

export const metadata: Metadata = { title: "Document Status" };

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const { partner } = await requirePartner();
  const { db } = getAuthContext();
  const documentTypes = await getPartnerDocumentTypes(db, partner.userId);
  const editable = isKycEditable(partner);

  return (
    <div className="max-w-3xl">
      <PartnerPageHeader
        eyebrow="Account verification"
        title="Document Status"
        description="Review your KYC details, required documents and verification state."
      />

      {!editable && (
        <p className="mt-5 rounded-lg border border-navy-800/15 bg-navy-800/[0.05] px-4 py-3 text-sm text-navy-700">
          {partner.status === "verified"
            ? "Your account is verified, so your KYC is locked. Contact us to change any details."
            : "Your application is under review — details and documents are locked until it's decided."}
        </p>
      )}

      <section className="mt-6">
        <h2 className="mb-4 font-display text-lg font-bold text-navy-950">Details</h2>
        <Card className="p-5 sm:p-6">
          <KycDetailsForm
            values={toKycFormValues(partner)}
            editable={editable}
            storageKey={`truelend:partner:kyc-details:${partner.userId}`}
          />
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-display text-lg font-bold text-navy-950">Documents</h2>
        <KycUpload uploadedDocumentTypes={documentTypes} editable={editable} />
      </section>
    </div>
  );
}
