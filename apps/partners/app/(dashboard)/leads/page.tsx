import { redirect } from "next/navigation";
import { Card } from "@truelend/ui";
import { requirePartner } from "@/lib/auth";
import { PartnerLeadForm } from "@/components/partner-lead-form";
import { CsvLeadUpload } from "@/components/csv-lead-upload";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { preselectedProduct } from "@/lib/preselected-product";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { partner } = await requirePartner();
  if (partner.type === "referral") redirect("/refer");
  const initialProduct = preselectedProduct((await searchParams).product);

  return (
    <div className="max-w-3xl">
      <PartnerPageHeader
        eyebrow="New business"
        title="Submit New Loan Case"
        description="Share a complete customer opportunity and coordinate its progress with the TrueLend Partner Support Team."
      />

      <Card className="mt-6 p-6 sm:p-8">
        <PartnerLeadForm variant="business" initialProduct={initialProduct} />
      </Card>

      <Card className="mt-6 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-navy-950">Submit multiple customers</h2>
        <p className="mt-1 text-sm text-navy-500">
          Already sourcing in volume? Import a CSV of complete customer opportunities.
        </p>
        <div className="mt-5">
          <CsvLeadUpload />
        </div>
      </Card>
    </div>
  );
}
export const metadata = { title: "Submit New Loan Case" };
