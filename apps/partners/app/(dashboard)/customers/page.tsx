import Link from "next/link";
import { ArrowLeft, ArrowRight, Handshake, UsersRound } from "lucide-react";
import { Button, Card, StatusBadge } from "@truelend/ui";
import { formatDate, leadStatusLabels, pipelineStatusTone, productName } from "@truelend/reference";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerLeadsPage } from "@/lib/dashboard-queries";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { partner } = await requirePartner();
  const { db } = getAuthContext();
  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const result = await getPartnerLeadsPage(
    db,
    partner.userId,
    Number.isFinite(requestedPage) ? requestedPage : 1,
  );
  const business = partner.type === "business";
  const submitHref = business ? "/leads" : "/refer";

  return (
    <div className="mx-auto max-w-7xl">
      <PartnerPageHeader
        eyebrow={business ? "Customer book" : "Your network"}
        title={business ? "My Customers" : "My Referrals"}
        description={
          business
            ? "Every customer sourced by you, with their current TrueLend status."
            : "A simple list of the people you introduced and where each referral stands."
        }
        action={
          <Button asChild>
            <Link href={submitHref}>{business ? "Submit New Loan Case" : "Refer Someone"}</Link>
          </Button>
        }
      />

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sun-100 text-navy-800">
              {business ? (
                <UsersRound className="h-5 w-5" aria-hidden />
              ) : (
                <Handshake className="h-5 w-5" aria-hidden />
              )}
            </span>
            <div>
              <h2 className="font-display font-bold text-navy-950">
                {result.total.toLocaleString("en-IN")} {business ? "customers" : "referrals"}
              </h2>
              <p className="text-xs text-navy-500">Newest first</p>
            </div>
          </div>
        </div>

        {result.rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-lg font-bold text-navy-950">
              {business ? "Your customer book is ready" : "Your first referral starts here"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-navy-600">
              {business
                ? "Submit a complete loan case and it will appear here for tracking."
                : "Introduce someone who needs a loan. TrueLend will handle the rest."}
            </p>
            <Button asChild className="mt-5">
              <Link href={submitHref}>{business ? "Submit a case" : "Refer someone"}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-hairline md:hidden">
              {result.rows.map((lead) => (
                <article key={lead.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-navy-950">{lead.name ?? "—"}</h3>
                      <p className="mt-0.5 text-xs text-navy-500">
                        {productName(lead.productSlug)}
                      </p>
                    </div>
                    <StatusBadge
                      tone={pipelineStatusTone(lead.status)}
                      label={leadStatusLabels[lead.status] ?? lead.status}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-600">
                    <span>{lead.phone ?? "No phone"}</span>
                    <span>{lead.city ?? "City not added"}</span>
                    <span>{formatDate(lead.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper-deep/70 text-xs uppercase tracking-[0.08em] text-muted">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Added</th>
                    <th className="px-6 py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {result.rows.map((lead) => (
                    <tr key={lead.id} className="hover:bg-navy-800/[0.025]">
                      <td className="px-6 py-4 font-semibold text-navy-950">{lead.name ?? "—"}</td>
                      <td className="px-4 py-4 text-navy-700">{productName(lead.productSlug)}</td>
                      <td className="px-4 py-4">
                        <p className="text-navy-700">{lead.phone ?? "—"}</p>
                        <p className="text-xs text-navy-500">{lead.city ?? "City not added"}</p>
                      </td>
                      <td className="px-4 py-4 tabular-nums text-navy-600">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <StatusBadge
                          tone={pipelineStatusTone(lead.status)}
                          label={leadStatusLabels[lead.status] ?? lead.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result.pageCount > 1 && (
          <nav
            className="flex items-center justify-between border-t border-hairline px-5 py-4 text-sm"
            aria-label={`${business ? "Customer" : "Referral"} pages`}
          >
            {result.page > 1 ? (
              <Link
                href={`/customers?page=${result.page - 1}`}
                className="flex items-center gap-1.5 font-semibold text-navy-700 hover:text-red-600"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-navy-500">
              Page {result.page} of {result.pageCount}
            </span>
            {result.page < result.pageCount ? (
              <Link
                href={`/customers?page=${result.page + 1}`}
                className="flex items-center gap-1.5 font-semibold text-navy-700 hover:text-red-600"
              >
                Next <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </Card>
    </div>
  );
}

export const metadata = { title: "Customers and referrals" };
