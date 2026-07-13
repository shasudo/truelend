import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeIndianRupee,
  BookOpenCheck,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  CircleCheckBig,
  Clock3,
  FolderKanban,
  Handshake,
  Megaphone,
  Sparkles,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { Button, Card, StatTile, StatusBadge } from "@truelend/ui";
import {
  earningsLabel,
  productName,
  leadStatusLabels,
  formatPaise,
  formatDate,
} from "@truelend/reference";
import { requirePartner, getAuthContext } from "@/lib/auth";
import { getPartnerMetrics, getPartnerLeads } from "@/lib/dashboard-queries";

export const dynamic = "force-dynamic";

interface ActionCard {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

function QuickActions({ business }: { business: boolean }) {
  const actions: ActionCard[] = business
    ? [
        {
          title: "Submit New Loan Case",
          description: "Add a complete customer case for the TrueLend team.",
          href: "/leads",
          icon: BriefcaseBusiness,
        },
        {
          title: "My Customers",
          description: "See every customer you have introduced.",
          href: "/customers",
          icon: UsersRound,
        },
        {
          title: "Pipeline",
          description: "Track logged-in, approved and disbursed cases.",
          href: "/pipeline",
          icon: FolderKanban,
        },
        {
          title: "Commission",
          description: "Review earnings, payments and your open balance.",
          href: "/earnings",
          icon: BadgeIndianRupee,
        },
      ]
    : [
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
  const partnerId = partner!.userId;
  const business = partner!.type === "business";
  const label = earningsLabel(partner!.type);

  const [m, leads] = await Promise.all([
    getPartnerMetrics(db, partnerId),
    getPartnerLeads(db, partnerId),
  ]);
  const balance = m.earnedPaise - m.paidPaise;
  const submitHref = business ? "/leads" : "/refer";
  const firstName = session.user.name.trim().split(" ")[0] || "Partner";

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
        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em]">
            <Sparkles className="h-4 w-4 text-red-600" aria-hidden />
            TrueLend {business ? "Business" : "Referral"} Partner™
          </p>
          <h1 className="mt-4 max-w-2xl text-balance font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Welcome, {firstName}.{" "}
            <span className="text-red-600">
              {business ? "Let’s move your next case." : "Your network can open doors."}
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-navy-800 sm:text-base">
            {business
              ? "Source customers, follow every milestone and grow your loan business with dedicated TrueLend support."
              : "Simply introduce someone who needs a loan. TrueLend takes care of the process while you track the referral and reward."}
          </p>
          <Button asChild className="mt-6 bg-navy-800 text-white hover:bg-navy-900">
            <Link href={submitHref}>
              {business ? "Submit New Loan Case" : "Refer Someone"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="performance-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
              Live overview
            </p>
            <h2
              id="performance-title"
              className="mt-1 font-display text-xl font-bold text-navy-950"
            >
              {business ? "Business performance" : "Your referral progress"}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatTile
            label={business ? "Customers" : "Referrals"}
            value={m.totalLeads.toLocaleString("en-IN")}
          />
          <StatTile
            label="In progress"
            value={m.activeLeads.toLocaleString("en-IN")}
            sub={business ? "Active cases" : "TrueLend is handling these"}
          />
          <StatTile label="Approved" value={m.approved.toLocaleString("en-IN")} />
          <StatTile
            label={business ? "Disbursed" : "Successful"}
            value={m.disbursed.toLocaleString("en-IN")}
          />
          {business && (
            <StatTile label="Disbursed volume" value={formatPaise(m.disbursedVolumePaise)} />
          )}
          <StatTile label={`${label} earned`} value={formatPaise(m.earnedPaise)} accent />
          {!business && <StatTile label="Rewards received" value={formatPaise(m.paidPaise)} />}
        </div>
      </section>

      <section className="mt-7" aria-labelledby="actions-title">
        <h2 id="actions-title" className="mb-3 font-display text-xl font-bold text-navy-950">
          {business ? "Manage your business" : "Everything you need"}
        </h2>
        <QuickActions business={business} />
      </section>

      <div className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                Recent activity
              </p>
              <h2 className="mt-1 font-display text-lg font-bold text-navy-950">
                {business ? "Latest customers" : "Latest referrals"}
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
                  {business ? (
                    <BriefcaseBusiness className="h-5 w-5" aria-hidden />
                  ) : (
                    <Handshake className="h-5 w-5" aria-hidden />
                  )}
                </span>
                <span>
                  {business ? "No customers submitted yet." : "No referrals yet."}{" "}
                  <Link href={submitHref} className="font-semibold text-red-600">
                    {business ? "Submit your first loan case" : "Refer someone now"}
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
                  status={lead.status}
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
                {label} summary
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
              {business ? "View commission ledger" : "View rewards"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
              {business ? "Partner advantage" : "Simple by design"}
            </p>
            <ul className="mt-4 space-y-3 text-sm text-navy-700">
              {(business
                ? [
                    { icon: Clock3, text: "Faster support on active cases" },
                    { icon: ChartNoAxesCombined, text: "Transparent lead tracking" },
                    { icon: BookOpenCheck, text: "Training and marketing resources" },
                  ]
                : [
                    { icon: CircleCheckBig, text: "No documentation expertise needed" },
                    { icon: CircleCheckBig, text: "No sales targets or investment" },
                    { icon: CircleCheckBig, text: "End-to-end support from TrueLend" },
                  ]
              ).map((item) => (
                <li key={item.text} className="flex gap-2.5">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                  {item.text}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const metadata = { title: "Dashboard" };
