import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePartnerSession, getAuthContext } from "@/lib/auth";
import { getPartnerDocumentTypes } from "@/lib/kyc-document-queries";
import { PartnerStatusScreen } from "@/components/partner-status-screen";
import { UnderReviewScreen } from "@/components/under-review-screen";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, partner } = await requirePartnerSession();
  if (!partner) redirect("/#partner-types");

  if (partner.status !== "verified") {
    if (partner.submittedAt && partner.status !== "rejected") {
      return <UnderReviewScreen name={session.user.name} email={session.user.email} />;
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

  return (
    <DashboardShell
      partnerType={partner.type}
      referenceId={partner.referenceId}
      name={session.user.name}
    >
      {children}
    </DashboardShell>
  );
}
