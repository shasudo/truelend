import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Briefcase, UserRoundPlus } from "lucide-react";
import { Button, Card, cx } from "@truelend/ui";
import { partnerPaths } from "@/lib/partner-network";

export function PartnerPathCards({ className }: { className?: string }) {
  return (
    <div className={cx("grid gap-4 lg:grid-cols-2", className)}>
      {partnerPaths.map((path) => {
        const business = path.type === "business";
        const Icon = business ? Briefcase : UserRoundPlus;
        const imageSrc = business ? "/images/business-partner.png" : "/images/referral-partner.png";
        const imageAlt = business
          ? "Indian business partner and loan professional in a navy suit"
          : "Indian referral partner holding a smartphone";

        return (
          <Card
            key={path.type}
            className={cx("overflow-hidden", business ? "border-navy-800/20" : "border-sun-500/40")}
          >
            <div className="relative aspect-[3/2] overflow-hidden border-b border-hairline">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                sizes="(min-width: 1024px) 560px, calc(100vw - 40px)"
                className="object-cover object-center"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(90deg,rgba(250,248,243,0.98)_0%,rgba(250,248,243,0.9)_42%,rgba(250,248,243,0)_72%)]"
              />
              <div className="absolute inset-y-0 left-0 flex w-[62%] flex-col justify-center p-5 sm:p-7">
                <span
                  className={cx(
                    "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm",
                    business ? "bg-navy-900 text-sun-400" : "bg-red-600 text-white",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-3 font-display text-xl font-extrabold leading-tight text-navy-950 sm:text-2xl">
                  {path.title}
                </h3>
                <p className="mt-2 text-sm font-semibold text-navy-700">{path.question}</p>
                <p className="mt-1 font-display text-sm font-extrabold text-red-600 sm:text-base">
                  {path.promise}
                </p>
              </div>
            </div>
            <div className="p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-600">
                  Who is this for?
                </p>
                <p className="mt-2 text-sm leading-relaxed text-navy-700">{path.who}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {path.examples.map((example) => (
                    <span
                      key={example}
                      className="rounded-full bg-paper-deep px-3 py-1 text-xs font-semibold text-navy-700"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-7 grid gap-6 border-t border-hairline pt-6 sm:grid-cols-2">
                <div>
                  <p className="font-display font-bold text-navy-950">What they do</p>
                  <ul className="mt-3 space-y-2">
                    {path.does.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm text-navy-700">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-display font-bold text-navy-950">What they receive</p>
                  <ul className="mt-3 space-y-2">
                    {path.receives.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm text-navy-700">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button asChild className="mt-7 w-full">
                <Link href={`/register/${path.type}`}>
                  Become a {business ? "Business" : "Referral"} Partner
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
