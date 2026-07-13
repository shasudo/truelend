import { Card } from "@truelend/ui";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerDocuments } from "@/lib/partner-queries";
import { kycEditable } from "@/lib/onboarding";
import { KycDetailsForm } from "@/components/kyc-details-form";
import { KycUpload } from "@/components/kyc-upload";

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const { partner } = await requirePartner();
  const { db } = getAuthContext();
  const documents = partner ? await getPartnerDocuments(db, partner.userId) : [];
  const editable = partner ? kycEditable(partner) : true;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">My KYC</h1>
      <p className="mt-1 text-navy-500">Keep your details and documents up to date.</p>

      {!editable && (
        <p className="mt-5 rounded-lg border border-navy-800/15 bg-navy-800/[0.05] px-4 py-3 text-sm text-navy-700">
          {partner?.status === "verified"
            ? "Your account is verified, so your KYC is locked. Contact us to change any details."
            : "Your application is under review — details and documents are locked until it's decided."}
        </p>
      )}

      {partner && (
        <section className="mt-6">
          <h2 className="mb-4 font-display text-lg font-bold text-navy-950">Details</h2>
          <Card className="p-6">
            <KycDetailsForm partner={partner} editable={editable} />
          </Card>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-4 font-display text-lg font-bold text-navy-950">Documents</h2>
        <KycUpload documents={documents} editable={editable} />
      </section>
    </div>
  );
}
export const metadata = { title: "KYC" };
