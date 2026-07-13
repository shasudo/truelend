import { requirePartner } from "@/lib/auth";
import { Card } from "@truelend/ui";
import { partnerTypeLabels, partnerStatusLabels } from "@truelend/reference";
import { ProfileForm } from "@/components/profile-form";

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
        <h2 className="font-display text-lg font-bold text-navy-950">Your details</h2>
        <p className="mt-1 text-sm text-navy-500">Update your name and contact number.</p>
        <div className="mt-5">
          <ProfileForm defaultName={session.user.name} defaultPhone={partner?.phone ?? ""} />
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <dl>
          <Row label="Email" value={session.user.email} />
          <Row label="Partner type" value={partner ? partnerTypeLabels[partner.type] : undefined} />
          <Row label="Status" value={partner ? partnerStatusLabels[partner.status] : undefined} />
          {partner?.businessName && <Row label="Business" value={partner.businessName} />}
        </dl>
        <p className="mt-4 text-xs text-muted">
          To change your email or KYC details, contact your relationship manager.
        </p>
      </Card>
    </div>
  );
}
export const metadata = { title: "Profile" };
