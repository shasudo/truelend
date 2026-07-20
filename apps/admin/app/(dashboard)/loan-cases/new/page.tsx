import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, Card, SubmitButton } from "@truelend/ui";
import { PageTitle } from "@/components/page-title";
import { LoanCaseFields } from "@/components/loan-case-fields";
import { getAuthContext } from "@/lib/auth";
import { getLead } from "@/lib/lead-queries";
import { createLoanCaseAction } from "@/lib/loan-actions";

export const dynamic = "force-dynamic";

export default async function NewLoanCasePage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead: leadId } = await searchParams;
  if (!leadId) redirect("/leads");

  const { db } = getAuthContext();
  const data = await getLead(db, leadId);
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

      <Card className="max-w-3xl p-6 sm:p-8">
        <form action={createLoanCaseAction} className="space-y-6">
          <input type="hidden" name="leadId" value={lead.id} />
          <LoanCaseFields defaults={{ productSlug: lead.productSlug ?? undefined }} />
          <div className="flex gap-2 border-t border-hairline pt-6">
            <SubmitButton pendingText="Creating…">Create loan case</SubmitButton>
            <Button type="button" variant="ghost" asChild>
              <Link href={`/leads/${lead.id}`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
export const metadata = { title: "New loan case" };
