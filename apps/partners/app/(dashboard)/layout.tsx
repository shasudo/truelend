import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePartnerSession, getAuthContext } from "@/lib/auth";
import { getPartnerDocumentTypes, getPartnerPhoto } from "@/lib/kyc-document-queries";
import { PartnerStatusScreen } from "@/components/partner-status-screen";
import { UnderReviewScreen } from "@/components/under-review-screen";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, partner } = await requirePartnerSession();
  if (!partner) redirect("/register/referral");

  if (partner.status !== "verified") {
    if (partner.submittedAt && partner.status !== "rejected") {
      return (
        <UnderReviewScreen
          name={session.user.name}
          email={session.user.email}
          referenceId={partner.referenceId}
          submittedAt={partner.submittedAt}
          referralType={partner.referralType}
          city={partner.city}
        />
      );
    }
    const { db } = getAuthContext();
    const documentTypes = await getPartnerDocumentTypes(db, partner.userId);
    return (
      <PartnerStatusScreen
        partner={partner}
        name={session.user.name}
        documentTypes={documentTypes}
      />
    );
  }

  const { db } = getAuthContext();
  const photo = await getPartnerPhoto(db, partner.userId);

  return (
    <DashboardShell
      referenceId={partner.referenceId}
      name={session.user.name}
      photoUrl={photo ? `/api/kyc/${photo.r2Key}` : null}
    >
      {children}
    </DashboardShell>
  );
}
