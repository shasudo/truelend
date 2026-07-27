import { requirePartner } from "@/lib/auth";
import { Card } from "@truelend/ui";
import { partnerStatusLabel, referralTypeLabel } from "@truelend/reference";
import { ProfileForm } from "@/components/profile-form";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-3 last:border-b-0 min-[420px]:flex-row min-[420px]:justify-between min-[420px]:gap-4">
      <dt className="text-sm text-navy-500">{label}</dt>
      <dd className="break-words text-sm font-medium text-navy-950 min-[420px]:text-right">
        {value || "—"}
      </dd>
    </div>
  );
}

export default async function ProfilePage() {
  const { session, partner } = await requirePartner();
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950">Profile</h1>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-navy-950">Your details</h2>
        <p className="mt-1 text-sm text-navy-500">Update your name and contact number.</p>
        <div className="mt-5">
          <ProfileForm
            defaultName={session.user.name}
            defaultPhone={partner.phone ?? ""}
            storageKey={`truelend:partner:profile:${partner.userId}`}
          />
        </div>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <dl>
          <Row label="Email" value={session.user.email} />
          <Row label="Program" value="Referral Partner" />
          <Row label="Referral type" value={referralTypeLabel(partner.referralType)} />
          <Row label="City" value={partner.city} />
          <Row label="Status" value={partnerStatusLabel(partner.status)} />
        </dl>
        <p className="mt-4 text-xs text-muted">
          To change your email or KYC details, contact your relationship manager.
        </p>
      </Card>
    </div>
  );
}
export const metadata = { title: "Profile" };
