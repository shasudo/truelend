import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@truelend/ui";
import { CreateLoanCaseForm } from "@/components/loan-case-action-forms";
import { PageTitle } from "@/components/page-title";
import { LoanCaseFields } from "@/components/loan-case-fields";
import { getAuthContext, requireStaff, scopeFor } from "@/lib/auth";
import { getLead } from "@/lib/lead-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New loan case" };

export default async function NewLoanCasePage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead: leadId } = await searchParams;
  if (!leadId) redirect("/leads");

  const session = await requireStaff();
  const { db } = getAuthContext();
  const data = await getLead(db, scopeFor(session), leadId);
  if (!data) notFound();
  const { lead } = data;

  return (
    <>
      <Link
        href={`/leads/${lead.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to lead
      </Link>
      <PageTitle title="New loan case" subtitle={`For ${lead.name ?? "this lead"}`} />

      <Card className="max-w-3xl p-5 sm:p-8">
        <CreateLoanCaseForm leadId={lead.id} cancelHref={`/leads/${lead.id}`}>
          <LoanCaseFields defaults={{ productSlug: lead.productSlug ?? undefined }} />
        </CreateLoanCaseForm>
      </Card>
    </>
  );
}
