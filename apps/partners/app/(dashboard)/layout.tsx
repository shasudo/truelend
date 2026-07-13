import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerDocuments } from "@/lib/partner-queries";
import { PartnerStatusScreen } from "@/components/partner-status-screen";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, partner } = await requirePartner();
  if (!partner) redirect("/register");

  // Not verified → the whole dashboard is the status + KYC screen.
  if (partner.status !== "verified") {
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
