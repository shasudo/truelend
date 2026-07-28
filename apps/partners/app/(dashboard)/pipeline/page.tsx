import Link from "next/link";
import { ArrowLeft, ArrowRight, Handshake } from "lucide-react";
import { Button, Card, StatusBadge } from "@truelend/ui";
import { formatDate, leadStatusLabels, pipelineStatusTone, productName } from "@truelend/reference";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerLeadsPage } from "@/lib/dashboard-queries";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { partner } = await requirePartner();
  const { db } = getAuthContext();
  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const referrals = await getPartnerLeadsPage(
    db,
    partner.userId,
    Number.isFinite(requestedPage) ? requestedPage : 1,
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PartnerPageHeader
        eyebrow="Simple tracking"
        title="Referral Status"
        description="See what is happening with each introduction. TrueLend manages the loan process for you."
        action={
          <Button asChild>
            <Link href="/refer">Refer Someone</Link>
          </Button>
        }
      />
      <div className="mt-6 space-y-3">
        {referrals.rows.length === 0 ? (
          <Card className="px-6 py-12 text-center">
            <Handshake className="mx-auto h-8 w-8 text-red-600" aria-hidden />
            <h2 className="mt-3 font-display text-lg font-bold text-navy-950">
              No referrals to track yet
            </h2>
            <p className="mt-1 text-sm text-navy-600">
              Make an introduction and its status will appear here.
            </p>
          </Card>
        ) : (
          referrals.rows.map((lead) => (
            <Card key={lead.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-navy-950">
                    {lead.name ?? "Referral"}
                  </h2>
                  <p className="mt-0.5 text-sm text-navy-500">
                    {productName(lead.productSlug)} · Referred {formatDate(lead.createdAt)}
                  </p>
                </div>
                <StatusBadge
                  tone={pipelineStatusTone(lead.status)}
                  label={leadStatusLabels[lead.status] ?? lead.status}
                />
              </div>
              <div
                className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 min-[420px]:gap-2"
                aria-label="Referral progress"
              >
                {[
                  { label: "Referred", complete: true },
                  {
                    label: "In progress",
                    complete: !["new", "declined", "lost"].includes(lead.status),
                  },
                  { label: "Successful", complete: lead.status === "disbursed" },
                ].map((step, index) => (
                  <div key={step.label}>
                    <div
                      className={`h-1.5 rounded-full ${step.complete ? "bg-red-600" : "bg-navy-100"}`}
                    />
                    <p className="mt-1.5 text-xs font-semibold text-navy-600 min-[420px]:mt-2">
                      {index + 1}. {step.label}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
      {referrals.pageCount > 1 && (
        <nav
          className="mt-4 flex items-center justify-between border-t border-hairline px-1 py-4 text-sm"
          aria-label="Referral pages"
        >
          {referrals.page > 1 ? (
            <Link
              href={`/pipeline?page=${referrals.page - 1}`}
              className="flex items-center gap-1.5 font-semibold text-navy-700 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-navy-500">
            Page {referrals.page} of {referrals.pageCount}
          </span>
          {referrals.page < referrals.pageCount ? (
            <Link
              href={`/pipeline?page=${referrals.page + 1}`}
              className="flex items-center gap-1.5 font-semibold text-navy-700 hover:text-red-600"
            >
              Next <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

export const metadata = { title: "Referral status" };
