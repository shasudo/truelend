import { redirect } from "next/navigation";
import { Card } from "@truelend/ui";
import { requirePartner } from "@/lib/auth";
import { PartnerLeadForm } from "@/components/partner-lead-form";

export const dynamic = "force-dynamic";

export default async function ReferPage() {
  const { partner } = await requirePartner();
  // Business partners use /leads instead.
  if (partner?.type === "business") redirect("/leads");

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">
        Refer a friend
      </h1>
      <p className="mt-1 text-navy-500">
        Know someone looking for a loan? Refer them and earn when they&rsquo;re disbursed.
      </p>

      <Card className="mt-6 p-6 sm:p-8">
        <PartnerLeadForm variant="referral" />
      </Card>
    </div>
  );
}
