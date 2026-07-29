import type { Metadata } from "next";
import { BadgeIndianRupee, CircleCheckBig, Clock3, WalletCards } from "lucide-react";
import { Card, StatTile } from "@truelend/ui";
import { formatDate, formatPaise, referralRewardLabel } from "@truelend/reference";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerMetrics, getPartnerPayouts } from "@/lib/dashboard-queries";

export const metadata: Metadata = { title: "Referral rewards" };

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const { partner } = await requirePartner();
  const { db } = getAuthContext();
  const [metrics, payouts] = await Promise.all([
    getPartnerMetrics(db, partner.userId),
    getPartnerPayouts(db, partner.userId),
  ]);
  const balance = metrics.earnedPaise - metrics.paidPaise;

  return (
    <div className="mx-auto max-w-6xl">
      <PartnerPageHeader
        eyebrow="Your earnings"
        title="Rewards Earned"
        description="Track every referral reward without targets, fees or complicated reports."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatTile
          label={`${referralRewardLabel} earned`}
          value={formatPaise(metrics.earnedPaise)}
          accent
        />
        <StatTile label="Received" value={formatPaise(metrics.paidPaise)} />
        <StatTile label="Balance" value={formatPaise(balance)} />
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-hairline px-6 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sun-100 text-navy-800">
            <WalletCards className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-navy-950">Reward history</h2>
            <p className="text-xs text-navy-500">Latest 50 entries</p>
          </div>
        </div>
        {payouts.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <BadgeIndianRupee className="mx-auto h-8 w-8 text-red-600" aria-hidden />
            <h3 className="mt-3 font-display text-lg font-bold text-navy-950">
              No referral rewards yet
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-navy-600">
              Eligible rewards will appear here after a successful referral is recorded.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-hairline">
            {payouts.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col items-stretch justify-between gap-3 px-5 py-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-4 sm:px-6"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      entry.kind === "paid" ? "bg-navy-800 text-white" : "bg-sun-100 text-navy-800"
                    }`}
                  >
                    {entry.kind === "paid" ? (
                      <CircleCheckBig className="h-4.5 w-4.5" aria-hidden />
                    ) : (
                      <Clock3 className="h-4.5 w-4.5" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-950">
                      {entry.kind === "paid" ? "Payment received" : `${referralRewardLabel} earned`}
                    </p>
                    <p className="truncate text-xs text-navy-500">
                      {entry.note || formatDate(entry.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pl-12 text-left min-[420px]:pl-0 min-[420px]:text-right">
                  <p className="font-display font-bold tabular-nums text-navy-950">
                    {entry.kind === "paid" ? "−" : "+"}
                    {formatPaise(entry.amountPaise)}
                  </p>
                  <p className="text-xs tabular-nums text-navy-500">
                    {formatDate(entry.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
