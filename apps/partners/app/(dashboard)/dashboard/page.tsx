import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeIndianRupee,
  CircleCheckBig,
  Handshake,
  Megaphone,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";
import { Button, Card, StatTile, StatusBadge } from "@truelend/ui";
import {
  referralRewardLabel,
  productName,
  leadStatusLabels,
  pipelineStatusTone,
  formatPaise,
  formatDate,
} from "@truelend/reference";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerMetrics, getPartnerLeads, getPartnerPipeline } from "@/lib/dashboard-queries";
import { PartnerIdChip } from "@/components/partner-id-chip";
import { PipelineDonut } from "@/components/pipeline-donut";
import { ProductCatalog, submitProductHref } from "@/components/product-catalog";
import { ReferralLinkCard } from "@/components/referral-link-card";

export const dynamic = "force-dynamic";

interface ActionCard {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const actions: ActionCard[] = [
  {
    title: "Refer Someone",
    description: "Share a few details. TrueLend handles everything else.",
    href: "/refer",
    icon: UserRoundPlus,
  },
  {
    title: "My Referrals",
    description: "See everyone you have referred in one simple list.",
    href: "/customers",
    icon: Handshake,
  },
  {
    title: "Rewards Earned",
    description: "Follow your earned and received referral rewards.",
    href: "/earnings",
    icon: BadgeIndianRupee,
  },
  {
    title: "Marketing Materials",
    description: "Use ready-to-share messages to grow your network.",
    href: "/marketing",
    icon: Megaphone,
  },
];

function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group rounded-xl border border-hairline bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-navy-800/30 hover:shadow-[0_18px_36px_-28px_rgba(7,13,36,0.65)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-800 text-sun-400">
            <action.icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="mt-4 flex items-center justify-between gap-2 font-display font-bold text-navy-950">
            {action.title}
            <ArrowRight
              className="h-4 w-4 shrink-0 text-navy-400 transition-transform group-hover:translate-x-1 group-hover:text-red-600"
              aria-hidden
            />
          </span>
          <span className="mt-1.5 block text-sm leading-relaxed text-navy-600">
            {action.description}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const { session, partner } = await requirePartner();
  const { db } = getAuthContext();
  const [metrics, leads, pipeline] = await Promise.all([
    getPartnerMetrics(db, partner.userId),
    getPartnerLeads(db, partner.userId),
    getPartnerPipeline(db, partner.userId),
  ]);
  const balance = metrics.earnedPaise - metrics.paidPaise;
  const firstName = session.user.name.trim().split(" ")[0] || "Referral Partner";

  return (
    <div className="mx-auto max-w-[1500px]">
      <section className="relative overflow-hidden rounded-2xl bg-sun-400 px-6 py-7 text-navy-950 shadow-[0_28px_70px_-50px_rgba(7,13,36,0.7)] sm:px-8 sm:py-9">
        <div
          aria-hidden
          className="absolute -right-12 -top-20 h-72 w-72 rotate-12 rounded-[3rem] bg-red-600"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 right-24 h-64 w-64 rotate-45 rounded-[2.5rem] border-[40px] border-navy-800/10"
        />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="flex items-center gap-2 pt-1 text-xs font-extrabold uppercase tracking-[0.16em]">
              <Sparkles className="h-4 w-4 text-red-600" aria-hidden />
              TrueLend Referral Partner
            </p>
            <PartnerIdChip
              referenceId={partner.referenceId}
              className="shadow-[0_18px_36px_-30px_rgba(7,13,36,0.9)]"
            />
          </div>
          <h1 className="mt-4 max-w-2xl text-balance font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Welcome, {firstName}. <span className="text-red-600">Your network can open doors.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-navy-800 sm:text-base">
            <span className="font-display font-bold text-navy-950">
              Help people get the right loan.
            </span>{" "}
            Refer family, friends, clients or contacts. TrueLend handles the journey from
            understanding their needs through lender matching and loan disbursement.
          </p>
          <Button asChild className="mt-6 bg-navy-800 text-white hover:bg-navy-900">
            <Link href="/refer">
              Refer Someone
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="performance-title">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
            Live overview
          </p>
          <h2 id="performance-title" className="mt-1 font-display text-xl font-bold text-navy-950">
            Your referral progress
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Referrals" value={metrics.totalLeads.toLocaleString("en-IN")} />
          <StatTile
            label="In progress"
            value={metrics.activeLeads.toLocaleString("en-IN")}
            sub="TrueLend is handling these"
          />
          <StatTile label="Approved" value={metrics.approved.toLocaleString("en-IN")} />
          <StatTile label="Successful" value={metrics.disbursed.toLocaleString("en-IN")} />
          <StatTile
            label={`${referralRewardLabel} earned`}
            value={formatPaise(metrics.earnedPaise)}
            accent
          />
          <StatTile label="Rewards received" value={formatPaise(metrics.paidPaise)} />
        </div>
      </section>

      <section className="mt-7" aria-labelledby="pipeline-title">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                Referral status
              </p>
              <h2 id="pipeline-title" className="mt-1 font-display text-lg font-bold text-navy-950">
                Referrals by stage
              </h2>
            </div>
            <Link
              href="/pipeline"
              className="text-sm font-semibold text-navy-700 hover:text-red-600"
            >
              View all
            </Link>
          </div>
          <PipelineDonut stages={pipeline} />
        </Card>
      </section>

      <section className="mt-7" aria-labelledby="actions-title">
        <h2 id="actions-title" className="mb-3 font-display text-xl font-bold text-navy-950">
          Everything you need
        </h2>
        <QuickActions />
      </section>

      <section className="mt-7" aria-labelledby="catalog-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
              Loans we place
            </p>
            <h2 id="catalog-title" className="mt-1 font-display text-xl font-bold text-navy-950">
              Loans you can refer
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-navy-600">
              Pick a category to start a referral with it already selected.
            </p>
          </div>
          <Link
            href="/products"
            className="shrink-0 text-sm font-semibold text-navy-700 hover:text-red-600"
          >
            View all
          </Link>
        </div>
        <ProductCatalog hrefFor={submitProductHref("/refer")} />
      </section>

      <section className="mt-7" aria-labelledby="referral-link-title">
        <h2 id="referral-link-title" className="sr-only">
          Referral link
        </h2>
        <ReferralLinkCard referenceId={partner.referenceId} />
      </section>

      <div className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                Recent activity
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-navy-950">
                Latest referrals
              </h2>
            </div>
            <Link
              href="/customers"
              className="text-sm font-semibold text-navy-700 hover:text-red-600"
            >
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-hairline">
            {leads.length === 0 && (
              <li className="flex flex-col items-start gap-3 py-7 text-sm text-muted">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sun-100 text-navy-800">
                  <Handshake className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  No referrals yet.{" "}
                  <Link href="/refer" className="font-semibold text-red-600">
                    Refer someone now
                  </Link>
                  .
                </span>
              </li>
            )}
            {leads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy-950">{lead.name ?? "—"}</p>
                  <p className="truncate text-xs text-navy-500">
                    {productName(lead.productSlug)} · {formatDate(lead.createdAt)}
                  </p>
                </div>
                <StatusBadge
                  tone={pipelineStatusTone(lead.status)}
                  label={leadStatusLabels[lead.status] ?? lead.status}
                />
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="overflow-hidden">
            <div className="bg-navy-900 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sun-400">
                {referralRewardLabel} summary
              </p>
              <p className="mt-2 font-display text-3xl font-extrabold tabular-nums">
                {formatPaise(balance)}
              </p>
              <p className="mt-1 text-xs text-on-dark-muted">Earned balance awaiting payment</p>
            </div>
            <Link
              href="/earnings"
              className="flex items-center justify-between p-4 text-sm font-semibold text-navy-800 hover:bg-navy-800/[0.04]"
            >
              View rewards
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
              Simple by design
            </p>
            <ul className="mt-4 space-y-3 text-sm text-navy-700">
              {[
                "No documentation expertise needed",
                "No sales targets or investment",
                "End-to-end support from TrueLend",
              ].map((text) => (
                <li key={text} className="flex gap-2.5">
                  <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const metadata = { title: "Referral Partner Dashboard" };
