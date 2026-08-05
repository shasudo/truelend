import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CreditCard } from "lucide-react";
import { Card, StatusBadge } from "@truelend/ui";
import {
  bankApplyLeadStatusLabels,
  bankApplyProductForSlug,
  formatDate,
  pipelineStatusTone,
} from "@truelend/reference";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { ReferralQrCard } from "@/components/referral-qr-card";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerBankLeads } from "@/lib/dashboard-queries";

export const metadata: Metadata = { title: "Card referrals" };

export const dynamic = "force-dynamic";

export default async function CardReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { partner } = await requirePartner();
  const { db } = getAuthContext();
  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const referrals = await getPartnerBankLeads(
    db,
    partner.userId,
    Number.isFinite(requestedPage) ? requestedPage : 1,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PartnerPageHeader
        eyebrow="Scan and apply"
        title="Card Referrals"
        description="Share your QR code so a customer can apply for a card directly on the bank's site — no form to fill in for either of you."
      />

      <div className="mt-6">
        <ReferralQrCard referenceId={partner.referenceId} />
      </div>

      <div className="mt-6 space-y-3">
        {referrals.rows.length === 0 ? (
          <Card className="px-6 py-12 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-red-600" aria-hidden />
            <h2 className="mt-3 font-display text-lg font-bold text-navy-950">
              No card referrals yet
            </h2>
            <p className="mt-1 text-sm text-navy-600">
              Once someone scans your QR code and applies, it will show up here.
            </p>
          </Card>
        ) : (
          referrals.rows.map((referral) => (
            <Card key={referral.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-navy-950">
                    {bankApplyProductForSlug(referral.productSlug)?.label ?? referral.productSlug}
                  </h2>
                  <p className="mt-0.5 text-sm text-navy-500">
                    {referral.phone} · Applied {formatDate(referral.createdAt)}
                  </p>
                  {referral.bankStage && (
                    <p className="mt-0.5 text-xs text-navy-500">
                      Bank status: {referral.bankStage}
                    </p>
                  )}
                </div>
                <StatusBadge
                  tone={pipelineStatusTone(referral.status)}
                  label={bankApplyLeadStatusLabels[referral.status] ?? referral.status}
                />
              </div>
            </Card>
          ))
        )}
      </div>

      {referrals.pageCount > 1 && (
        <nav
          className="mt-4 flex items-center justify-between border-t border-hairline px-1 py-4 text-sm"
          aria-label="Card referral pages"
        >
          {referrals.page > 1 ? (
            <Link
              href={`/card-referrals?page=${referrals.page - 1}`}
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
              href={`/card-referrals?page=${referrals.page + 1}`}
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
