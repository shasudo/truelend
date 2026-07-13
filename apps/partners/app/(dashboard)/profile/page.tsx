import { requirePartner } from "@/lib/auth";
import { Card } from "@truelend/ui";
import { partnerTypeLabels, partnerStatusLabels } from "@truelend/reference";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-hairline py-3 last:border-b-0">
      <dt className="text-sm text-navy-500">{label}</dt>
      <dd className="text-sm font-medium text-navy-950">{value || "—"}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const { session, partner } = await requirePartner();
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">Profile</h1>
      <Card className="mt-6 p-6">
        <dl>
          <Row label="Name" value={session.user.name} />
          <Row label="Email" value={session.user.email} />
          <Row label="Partner type" value={partner ? partnerTypeLabels[partner.type] : undefined} />
          <Row label="Status" value={partner ? partnerStatusLabels[partner.status] : undefined} />
          <Row label="Phone" value={partner?.phone} />
          {partner?.businessName && <Row label="Business" value={partner.businessName} />}
        </dl>
      </Card>
    </div>
  );
}
