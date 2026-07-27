import Link from "next/link";
import {
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  FileText,
  Headset,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import { Button } from "@truelend/ui";
import { bankName, type BankSlug } from "@truelend/reference";
import { Reveal } from "@/components/reveal";

const profileDetails = [
  { label: "Personal & contact", detail: "Details", icon: UserRound },
  { label: "Employment & income", detail: "Details", icon: BriefcaseBusiness },
  { label: "Loan requirement", detail: "Details", icon: FileText },
  { label: "Existing obligations", detail: "(EMI, loans)", icon: WalletCards },
];

const assessments = [
  "Financial assessment",
  "Credit assessment",
  "Borrowing capacity",
  "Lender policy matching",
  "Risk & affordability",
];

const lenderMatches = [
  {
    bankSlug: "icici",
    mark: "i",
    markClass: "bg-red-600 text-white",
    match: "Excellent match",
    matchClass: "bg-red-50 text-red-700",
    amount: "₹86 Lakhs",
    rate: "8.40%",
    probability: "96%",
  },
  {
    bankSlug: "hdfc",
    mark: "H",
    markClass: "bg-navy-800 text-white",
    match: "Strong match",
    matchClass: "bg-navy-50 text-navy-700",
    amount: "₹84 Lakhs",
    rate: "8.45%",
    probability: "94%",
  },
  {
    bankSlug: "sbi",
    mark: "S",
    markClass: "bg-navy-500 text-white",
    match: "Good match",
    matchClass: "bg-navy-50 text-navy-600",
    amount: "₹81 Lakhs",
    rate: "8.35%",
    probability: "90%",
  },
] satisfies ReadonlyArray<{
  bankSlug: BankSlug;
  mark: string;
  markClass: string;
  match: string;
  matchClass: string;
  amount: string;
  rate: string;
  probability: string;
}>;

const assurances = [
  { label: "Confidential", icon: LockKeyhole },
  { label: "Access to Multiple Lenders", icon: Landmark },
  { label: "Expert guidance", icon: UserRoundCheck },
  { label: "No obligation", icon: ShieldCheck },
];

function ProfilePanel() {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white/95 p-3.5 shadow-[0_18px_50px_-34px_rgba(20,32,74,0.5)]">
      <p className="px-2 pb-2 text-center text-[0.64rem] font-bold uppercase tracking-[0.14em] text-navy-700">
        You tell us about yourself
      </p>
      <ul className="space-y-1">
        {profileDetails.map(({ label, detail, icon: Icon }, i) => (
          <li
            key={label}
            className="flex animate-[tl-scan_4.4s_ease-in-out_infinite] items-center gap-2.5 rounded-xl px-2 py-2 text-[0.66rem] font-medium leading-tight text-navy-800"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span>
              <span className="block">{label}</span>
              <span className="mt-0.5 block text-[0.57rem] text-muted">{detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IntelligenceCore() {
  return (
    <div className="relative rounded-[2rem] border border-navy-100 bg-white/95 p-4 shadow-[0_24px_70px_-36px_rgba(54,40,160,0.5)]">
      <div
        className="absolute inset-x-8 top-2 h-28 animate-[tl-halo_3.4s_ease-in-out_infinite] rounded-full bg-navy-200/35 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col items-center text-center">
        {/* Rings, probe and glyph each rotate on their own period so the core
         * reads as layered motion instead of one rigid disc. */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span
            className="absolute -inset-3 animate-[tl-spin-reverse_24s_linear_infinite] rounded-full border border-dotted border-navy-200"
            aria-hidden
          />
          <span
            className="absolute -inset-1 animate-[tl-spin_14s_linear_infinite] rounded-full border border-dashed border-navy-300"
            aria-hidden
          />
          <span className="absolute -inset-1 animate-[tl-spin_5s_linear_infinite]" aria-hidden>
            <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600 shadow-[0_0_10px_rgba(206,14,23,0.85)]" />
          </span>
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-navy-200 bg-[radial-gradient(circle,#ffffff_18%,#eef0f7_48%,#dfe3ef_70%,#ffffff_72%)] shadow-[0_0_45px_rgba(109,125,172,0.28)]">
            {/* Rotation lives on a wrapper: the glyph's own transform is the
             * breathe, and two transform animations on one element don't compose. */}
            <span className="inline-flex animate-[tl-spin_20s_linear_infinite]">
              <BrainCircuit
                className="h-11 w-11 animate-[tl-breathe_3.4s_ease-in-out_infinite] text-navy-700"
                aria-hidden
              />
            </span>
          </div>
        </div>
        <p className="mt-3 font-display text-base font-extrabold uppercase leading-tight tracking-tight text-navy-950">
          TrueLend borrowing
          <br />
          intelligence
        </p>
        <ul className="mt-4 w-full rounded-2xl border border-navy-100 bg-white p-3 text-left shadow-[0_12px_34px_-26px_rgba(20,32,74,0.45)]">
          {assessments.map((assessment, i) => (
            <li
              key={assessment}
              className="flex items-center gap-2 py-1.5 text-[0.67rem] font-medium text-navy-800"
            >
              <span
                className="flex h-4 w-4 shrink-0 animate-[tl-tick_4.4s_ease-in-out_infinite] items-center justify-center rounded-full bg-navy-50 text-navy-700"
                style={{ animationDelay: `${0.9 + i * 0.18}s` }}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
              </span>
              {assessment}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LenderPanel() {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white/95 p-3 shadow-[0_22px_60px_-34px_rgba(20,32,74,0.5)]">
      <div className="px-1 pb-2 text-center">
        <p className="text-[0.64rem] font-bold uppercase tracking-[0.12em] text-navy-700">
          Recommended lenders
        </p>
        <p className="mt-0.5 text-[0.58rem] text-muted">Ranked for your profile</p>
      </div>
      <ul className="space-y-2">
        {lenderMatches.map((lender, i) => (
          <li
            key={lender.bankSlug}
            className="animate-[tl-highlight_4.4s_ease-in-out_infinite] rounded-xl border border-navy-100 bg-white p-3 shadow-[0_10px_28px_-24px_rgba(20,32,74,0.55)]"
            style={{ animationDelay: `${1.5 + i * 0.18}s` }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-navy-950">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[0.64rem] font-black ${lender.markClass}`}
                >
                  {lender.mark}
                </span>
                <span className="truncate">{bankName(lender.bankSlug)}</span>
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[0.48rem] font-bold ${lender.matchClass}`}
              >
                {lender.match}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <dt className="text-[0.48rem] text-muted">Max loan amount</dt>
                <dd className="mt-0.5 text-[0.68rem] font-extrabold text-navy-950">
                  {lender.amount}
                </dd>
              </div>
              <div>
                <dt className="text-[0.48rem] text-muted">Interest rate (p.a.)</dt>
                <dd className="mt-0.5 text-[0.68rem] font-extrabold text-navy-950">
                  {lender.rate}
                </dd>
              </div>
              <div className="col-span-2 border-t border-navy-100 pt-2">
                <dt className="text-[0.48rem] text-muted">Approval probability</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-navy-100">
                    <span
                      className="block h-full origin-left animate-[tl-fill_1.1s_var(--ease-out-quart)_both] rounded-full bg-red-600"
                      style={{ width: lender.probability, animationDelay: `${0.5 + i * 0.15}s` }}
                    />
                  </span>
                  <span className="text-[0.68rem] font-extrabold text-navy-950">
                    {lender.probability}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-navy-500" aria-hidden />
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <Link
        href="/products"
        className="mt-2 flex items-center justify-center gap-1 rounded-xl border border-navy-100 px-3 py-2.5 text-[0.58rem] font-bold text-navy-700 transition-colors hover:bg-navy-50"
      >
        View more matched lenders
        <ChevronRight className="h-3 w-3" aria-hidden />
      </Link>
      <p className="pt-2 text-center text-[0.48rem] text-muted">Illustrative profile preview</p>
    </div>
  );
}

function FlowConnections() {
  const intakePaths = [
    "M195 128 C220 128 208 128 231 128",
    "M195 210 C220 210 208 210 231 210",
    "M195 292 C220 292 208 292 231 292",
    "M195 374 C220 374 208 374 231 374",
  ];
  const matchPaths = [
    "M493 104 C516 104 504 76 526 76",
    "M493 178 C518 178 504 160 526 160",
    "M493 252 C518 252 504 252 526 252",
    "M493 326 C518 326 504 344 526 344",
    "M493 400 C516 400 506 430 526 430",
  ];
  const sourceDots = [128, 210, 292, 374];
  const coreLeftDots = [128, 210, 292, 374];
  const coreRightDots = [104, 178, 252, 326, 400];
  const lenderDots = [76, 160, 252, 344, 430];

  return (
    <svg
      viewBox="0 0 760 500"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block"
      aria-hidden
    >
      <g fill="none" stroke="#9ba7c9" strokeWidth="1.15" opacity="0.72">
        {[...intakePaths, ...matchPaths].map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {/* Pulses ride the same wires. Intake leads; matches trail by 0.8s so the
       * eye reads profile → core → lenders rather than one simultaneous flash. */}
      <g fill="none" strokeWidth="2.2" strokeLinecap="round" className="stroke-red-600">
        {intakePaths.map((d, i) => (
          <path key={d} d={d} className="tl-flow" style={{ animationDelay: `${i * 0.14}s` }} />
        ))}
        {matchPaths.map((d, i) => (
          <path
            key={d}
            d={d}
            className="tl-flow"
            style={{ animationDelay: `${0.8 + i * 0.14}s` }}
          />
        ))}
      </g>
      <g fill="#46578f" stroke="#ffffff" strokeWidth="1.5">
        {sourceDots.map((y, i) => (
          <circle
            key={`source-${y}`}
            cx="195"
            cy={y}
            r="3.1"
            className="tl-node"
            style={{ animationDelay: `${i * 0.14}s` }}
          />
        ))}
        {coreLeftDots.map((y, i) => (
          <circle
            key={`core-left-${y}`}
            cx="231"
            cy={y}
            r="3.1"
            className="tl-node"
            style={{ animationDelay: `${0.4 + i * 0.14}s` }}
          />
        ))}
        {coreRightDots.map((y, i) => (
          <circle
            key={`core-right-${y}`}
            cx="493"
            cy={y}
            r="3.1"
            className="tl-node"
            style={{ animationDelay: `${0.8 + i * 0.14}s` }}
          />
        ))}
        {lenderDots.map((y, i) => (
          <circle
            key={`lender-${y}`}
            cx="526"
            cy={y}
            r="3.1"
            className="tl-node"
            style={{ animationDelay: `${1.2 + i * 0.14}s` }}
          />
        ))}
      </g>
    </svg>
  );
}

function BorrowingIntelligenceVisual() {
  return (
    <div
      className="tl-diagram relative mx-auto w-full max-w-[48rem]"
      aria-label="How TrueLend matches a borrower profile to suitable lenders"
    >
      <div className="absolute inset-10 rounded-full bg-navy-200/30 blur-3xl" aria-hidden />
      <div className="relative grid items-center gap-8 lg:grid-cols-[0.78fr_1.05fr_0.95fr] lg:gap-10">
        <FlowConnections />
        <div className="relative z-10 after:absolute after:-bottom-8 after:left-1/2 after:h-8 after:border-l after:border-dashed after:border-navy-300 lg:after:hidden">
          <ProfilePanel />
        </div>
        <div className="relative z-10 after:absolute after:-bottom-8 after:left-1/2 after:h-8 after:border-l after:border-dashed after:border-navy-300 lg:after:hidden">
          <IntelligenceCore />
        </div>
        <div className="relative z-10">
          <LenderPanel />
        </div>
      </div>
      <div className="relative mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-navy-600 before:absolute before:-top-4 before:left-1/2 before:h-4 before:border-l before:border-dashed before:border-navy-300">
        <span className="inline-flex items-center gap-1.5">
          <LockKeyhole className="h-3 w-3" aria-hidden />
          Data secure &amp; confidential
        </span>
        <span className="text-navy-300" aria-hidden>
          |
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          100% secure process
        </span>
      </div>
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#faf8f3_45%,#f4f3fb_100%)]">
      <div
        className="absolute -right-20 bottom-10 h-72 w-[52rem] rounded-[100%] border border-navy-100/70"
        aria-hidden
      />
      <div
        className="absolute -right-24 bottom-4 h-48 w-[44rem] rounded-[100%] border border-navy-100/60"
        aria-hidden
      />
      <div className="relative mx-auto grid w-full max-w-[95rem] items-start gap-12 px-5 pb-12 pt-6 sm:px-8 sm:pb-16 sm:pt-8 xl:grid-cols-[0.9fr_1.1fr] xl:gap-8 xl:pb-14 xl:pt-6">
        <div className="max-w-[42rem]">
          <Reveal immediate>
            <h1 className="break-words text-balance font-display text-[clamp(2.2rem,11vw,4rem)] font-extrabold uppercase leading-[0.99] tracking-[-0.035em] text-navy-950 sm:tracking-[-0.045em]">
              Before you apply
              <br />
              for a loan,
              <br />
              <span className="relative inline-block text-red-600">
                talk to TrueLend first.
                <span
                  className="absolute -bottom-2 left-[55%] h-1 w-20 -rotate-2 rounded-full bg-red-600 min-[400px]:left-[62%] min-[400px]:w-28"
                  aria-hidden
                />
              </span>
            </h1>
            <p className="mt-6 max-w-[38rem] text-lg font-semibold leading-8 text-navy-800">
              Because the right loan matters. We help you find it from the right lender.
            </p>
          </Reveal>
          <Reveal immediate delay={0.1}>
            <p className="mt-5 max-w-[38rem] text-base leading-7 text-navy-700">
              Need a Personal Loan, Business Loan, Home Loan or any other borrowing solution? Before
              you approach a bank or NBFC, let our experienced Borrowing Advisors understand your
              borrowing requirement and financial profile. Using the TrueLend Borrowing Intelligence
              Framework, we compare your profile with the lending policies of multiple banks, NBFCs
              and Fintech Lenders to help identify borrowing options that may offer higher
              eligibility and competitive borrowing terms.
            </p>
          </Reveal>
          <Reveal immediate delay={0.2}>
            <div className="mt-7 flex flex-col items-stretch gap-3 min-[480px]:flex-row min-[480px]:flex-wrap">
              <Button
                size="lg"
                asChild
                className="w-full shadow-[0_14px_30px_-18px_rgba(206,14,23,0.75)] min-[480px]:w-auto"
              >
                <Link href="/enquiry">
                  <Headset className="h-4 w-4" aria-hidden />
                  Talk to a Borrowing Advisor
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full bg-white/70 min-[480px]:w-auto"
              >
                <Link href="/contact">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  Request a Callback
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>

        <Reveal immediate delay={0.15} className="min-w-0">
          <BorrowingIntelligenceVisual />
        </Reveal>
      </div>

      <div className="relative mx-auto w-full max-w-[95rem] px-5 pb-5 sm:px-8">
        <ul className="grid gap-2 rounded-2xl border border-navy-100 bg-white/80 p-2 shadow-[0_18px_50px_-38px_rgba(20,32,74,0.5)] backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4">
          {assurances.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-navy-800"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
