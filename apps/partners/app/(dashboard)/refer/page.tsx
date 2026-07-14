import { redirect } from "next/navigation";
import { Card } from "@truelend/ui";
import { requirePartner } from "@/lib/auth";
import { PartnerLeadForm } from "@/components/partner-lead-form";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { ReferralLinkCard } from "@/components/referral-link-card";

export const dynamic = "force-dynamic";

export default async function ReferPage() {
  const { partner } = await requirePartner();
  if (partner?.type === "business") redirect("/leads");

  return (
    <div className="max-w-3xl">
      <PartnerPageHeader
        eyebrow="One simple introduction"
        title="Refer Someone"
        description="Know someone looking for a loan? Share their details with consent, or send them your own link to apply directly. TrueLend handles everything else."
      />

      <div className="mt-6">
        <ReferralLinkCard referenceId={partner!.referenceId} />
      </div>

      <Card className="mt-4 p-6 sm:p-8">
        <PartnerLeadForm variant="referral" />
      </Card>
    </div>
  );
}
export const metadata = { title: "Refer a customer" };
