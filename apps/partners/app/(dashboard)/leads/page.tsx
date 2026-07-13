import { redirect } from "next/navigation";
import { Card } from "@truelend/ui";
import { requirePartner } from "@/lib/auth";
import { PartnerLeadForm } from "@/components/partner-lead-form";
import { CsvLeadUpload } from "@/components/csv-lead-upload";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const { partner } = await requirePartner();
  if (partner?.type === "referral") redirect("/refer");

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">
        Submit a lead
      </h1>
      <p className="mt-1 text-navy-500">
        Send us a customer and track it through to disbursal on your dashboard.
      </p>

      <Card className="mt-6 p-6 sm:p-8">
        <PartnerLeadForm variant="business" />
      </Card>

      <Card className="mt-6 p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-navy-950">Bulk upload</h2>
        <p className="mt-1 text-sm text-navy-500">Sourcing in volume? Import a CSV of leads.</p>
        <div className="mt-5">
          <CsvLeadUpload />
        </div>
      </Card>
    </div>
  );
}
