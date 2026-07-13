import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerDocuments } from "@/lib/partner-queries";
import { KycUpload } from "@/components/kyc-upload";

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const { partner } = await requirePartner();
  const { db } = getAuthContext();
  const documents = partner ? await getPartnerDocuments(db, partner.userId) : [];

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">
        My documents
      </h1>
      <p className="mt-1 text-navy-500">Keep your KYC documents up to date.</p>
      <div className="mt-6">
        <KycUpload documents={documents} />
      </div>
    </div>
  );
}
