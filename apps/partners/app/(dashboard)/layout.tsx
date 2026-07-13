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
  if (!partner) redirect("/register");

  if (partner.status !== "verified") {
    // Submitted (and not sent back) → clean "under review" confirmation.
    if (partner.submittedAt && partner.status !== "rejected") {
      return (
        <UnderReviewScreen partner={partner} name={session.user.name} email={session.user.email} />
      );
    }
    // Otherwise → the fill-in-your-application screen (also for rejected).
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
