import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  Clock3,
  Info,
  MessageSquareQuote,
  Target,
} from "lucide-react";
import { Accordion, Button, Card } from "@truelend/ui";
import { PartnerPageHeader } from "@/components/partner-page-header";
import { requirePartner } from "@/lib/auth";
import { knowledgeCheck, trainingModules, type Block } from "@/lib/training-content";

export const metadata: Metadata = { title: "Learn and earn" };

export const dynamic = "force-dynamic";

const totalMinutes = trainingModules.reduce((sum, module) => sum + module.minutes, 0);

const calloutStyles = {
  do: {
    icon: BadgeCheck,
    wrap: "border-l-4 border-l-navy-800 bg-navy-800/[0.04]",
    mark: "text-navy-800",
  },
  dont: { icon: CircleAlert, wrap: "border-l-4 border-l-red-600 bg-red-50", mark: "text-red-600" },
  note: { icon: Info, wrap: "border-l-4 border-l-sun-400 bg-sun-100/60", mark: "text-navy-800" },
} as const;

/*
 * Five block kinds cover every lesson in training-content.ts. Anything that
 * cannot be said with these five is a sign the content wants restructuring,
 * not that this switch wants a sixth case.
 */
function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "text":
      return <p className="text-[0.95rem] leading-relaxed text-navy-700">{block.body}</p>;

    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className="space-y-2.5 text-[0.95rem] leading-relaxed text-navy-700">
          {block.items.map((item, index) => (
            <li key={item} className="flex gap-3">
              {block.ordered ? (
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[0.7rem] font-bold text-sun-400">
                  {index + 1}
                </span>
              ) : (
                <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              )}
              <span>{item}</span>
            </li>
          ))}
        </List>
      );
    }

    case "table":
      return (
        <figure className="max-w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-hairline">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-hairline bg-paper text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
                {block.head.map((cell) => (
                  <th key={cell} className="px-4 py-3 font-semibold">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")} className="border-b border-hairline last:border-b-0">
                  {row.map((cell, index) => (
                    <td
                      key={cell + index}
                      className={
                        index === 0
                          ? "px-4 py-3 align-top font-medium text-navy-950"
                          : "px-4 py-3 align-top leading-relaxed text-navy-600"
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.caption && (
            <figcaption className="border-t border-hairline px-4 py-2.5 text-xs text-muted">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "callout": {
      const style = calloutStyles[block.tone];
      return (
        <div className={`rounded-r-xl px-5 py-4 ${style.wrap}`}>
          <p className="flex items-center gap-2 font-display text-sm font-bold text-navy-950">
            <style.icon className={`h-4 w-4 shrink-0 ${style.mark}`} aria-hidden />
            {block.title}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-navy-700">{block.body}</p>
        </div>
      );
    }

    case "script":
      return (
        <div className="rounded-xl border border-hairline bg-paper p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            <MessageSquareQuote className="h-4 w-4 text-red-600" aria-hidden />
            {block.title}
          </p>
          <dl className="mt-4 space-y-3.5">
            {block.lines.map((line) => (
              <div key={line.who + line.say} className="sm:flex sm:gap-4">
                <dt className="shrink-0 text-xs font-bold uppercase tracking-[0.1em] text-navy-500 sm:w-16 sm:pt-0.5">
                  {line.who}
                </dt>
                <dd className="mt-1 text-[0.95rem] leading-relaxed text-navy-800 sm:mt-0">
                  “{line.say}”
                </dd>
              </div>
            ))}
          </dl>
        </div>
      );
  }
}

export default async function TrainingPage() {
  await requirePartner();

  return (
    <div className="mx-auto max-w-4xl">
      <PartnerPageHeader
        eyebrow="Referral Partner course"
        title="Learn & Earn"
        description="No lending experience required. Ten modules take you from zero to a confident, compliant referral — the vocabulary, the products, who qualifies, what to say, and the rules that are not negotiable."
      />

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-navy-600">
          <span className="flex items-center gap-2 font-semibold text-navy-950">
            <Target className="h-4 w-4 text-red-600" aria-hidden />
            {trainingModules.length} modules
          </span>
          <span className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-navy-400" aria-hidden />
            About {totalMinutes} minutes end to end
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-navy-600">
          Work through it in order the first time — later modules assume the vocabulary from Module
          2. After that, treat it as a reference: the scripts, the eligibility maths and the rules
          are worth coming back to before a difficult conversation.
        </p>
        <ol className="mt-5 grid gap-2 sm:grid-cols-2">
          {trainingModules.map((module, index) => (
            <li key={module.slug}>
              <a
                href={`#${module.slug}`}
                className="flex items-baseline gap-3 rounded-lg px-3 py-2 text-sm hover:bg-paper"
              >
                <span className="font-display text-xs font-extrabold text-navy-300">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-medium text-navy-800">{module.title}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">{module.minutes} min</span>
              </a>
            </li>
          ))}
        </ol>
      </Card>

      {trainingModules.map((module, index) => (
        <section key={module.slug} id={module.slug} className="mt-6 scroll-mt-6">
          <Card className="p-5 sm:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                Module {String(index + 1).padStart(2, "0")}
              </p>
              <p className="shrink-0 text-xs text-muted">{module.minutes} min</p>
            </div>
            <h2 className="mt-2 font-display text-2xl font-extrabold text-navy-950">
              {module.title}
            </h2>
            <p className="mt-2 leading-relaxed text-navy-600">{module.summary}</p>

            <div className="mt-5 rounded-xl bg-navy-900 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sun-400">
                By the end you can
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed">
                {module.outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-2.5">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-sun-400" aria-hidden />
                    {outcome}
                  </li>
                ))}
              </ul>
            </div>

            {module.lessons.map((lesson, lessonIndex) => (
              <div key={lesson.title} className="mt-8 border-t border-hairline pt-6">
                <h3 className="font-display text-lg font-bold text-navy-950">
                  <span className="mr-2 tabular-nums text-navy-300">
                    {index + 1}.{lessonIndex + 1}
                  </span>
                  {lesson.title}
                </h3>
                <div className="mt-4 space-y-4">
                  {lesson.blocks.map((block, blockIndex) => (
                    <BlockView key={blockIndex} block={block} />
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </section>
      ))}

      <section className="mt-6" id="knowledge-check">
        <Card className="p-5 sm:p-8">
          <h2 className="font-display text-2xl font-extrabold text-navy-950">Knowledge check</h2>
          <p className="mt-2 text-sm leading-relaxed text-navy-600">
            Ten real situations. Answer each one in your head before you open it — if any answer
            surprises you, go back to the module it came from.
          </p>
          <Accordion items={knowledgeCheck} className="mt-5" />
        </Card>
      </section>

      <section className="mt-6 flex flex-col items-start justify-between gap-5 rounded-2xl bg-navy-900 p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sun-400">
            Ready to act?
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold">
            Make your first helpful introduction.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
            Get consent, then submit the referral the same day while the details are still accurate.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/refer">
            Refer Someone
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </section>
    </div>
  );
}
