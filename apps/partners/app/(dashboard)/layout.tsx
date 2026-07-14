import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerDocuments } from "@/lib/partner-queries";
import { PartnerStatusScreen } from "@/components/partner-status-screen";
import { UnderReviewScreen } from "@/components/under-review-screen";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, partner } = await requirePartner();
  if (!partner) redirect("/#partner-types");

  if (partner.status !== "verified") {
    if (partner.submittedAt && partner.status !== "rejected") {
      return (
        <UnderReviewScreen partner={partner} name={session.user.name} email={session.user.email} />
      );
    }
    const { db } = getAuthContext();
    const documents = await getPartnerDocuments(db, partner.userId);
    return <PartnerStatusScreen partner={partner} name={session.user.name} documents={documents} />;
  }

  return (
    <DashboardShell partner={partner} name={session.user.name}>
      {children}
    </DashboardShell>
  );
}
