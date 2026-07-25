import { BadgeCheck, Forward, Megaphone, MessageCircleMore, Share2 } from "lucide-react";
import { Card } from "@truelend/ui";
import { PartnerPageHeader } from "@/components/partner-page-header";

export const dynamic = "force-dynamic";

const referralMessages = [
  {
    title: "Simple introduction",
    copy: "Know someone looking for a loan? I can introduce them to TrueLend, where the team will guide them through the process. Send me a message if you would like an introduction.",
  },
  {
    title: "WhatsApp status",
    copy: "Looking for a home, business, personal, vehicle or education loan? I can connect you with the TrueLend team. Message me to get started.",
  },
  {
    title: "Personal network",
    copy: "If a friend, colleague or family member needs help finding a suitable loan, I can refer them to TrueLend. The team handles the process end to end.",
  },
];

export default async function MarketingPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PartnerPageHeader
        eyebrow="Share with confidence"
        title="Marketing Materials"
        description="Simple messages you can share with people you already know—no sales pitch required."
      />

      <section className="relative mt-6 overflow-hidden rounded-2xl bg-sun-400 p-6 text-navy-950 sm:p-8">
        <div
          aria-hidden
          className="absolute -right-8 -top-16 hidden h-56 w-32 rotate-12 bg-red-600 sm:block"
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em]">
            TrueLend Referral Partner Network
          </p>
          <h2 className="mt-3 text-balance font-display text-4xl font-extrabold leading-none sm:text-5xl">
            Refer loans. Earn extra income.
          </h2>
          <p className="mt-4 max-w-lg font-medium leading-relaxed text-navy-800">
            No investment. No sales targets. TrueLend handles the loan journey from introduction
            onward.
          </p>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="messages-title">
        <div className="flex items-center gap-3">
          <MessageCircleMore className="h-5 w-5 text-red-600" aria-hidden />
          <h2 id="messages-title" className="font-display text-xl font-bold text-navy-950">
            Ready-to-share messages
          </h2>
        </div>
        <p className="mt-1 text-sm text-navy-600">
          Personalize the wording and share only with people who expect to hear from you.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {referralMessages.map((message, index) => (
            <Card key={message.title} className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 text-sun-400">
                  {index === 0 ? (
                    <Forward className="h-4.5 w-4.5" aria-hidden />
                  ) : index === 1 ? (
                    <Megaphone className="h-4.5 w-4.5" aria-hidden />
                  ) : (
                    <Share2 className="h-4.5 w-4.5" aria-hidden />
                  )}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Template {index + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-navy-950">{message.title}</h3>
              <p className="mt-3 flex-1 rounded-lg bg-paper-deep/60 p-4 text-sm leading-relaxed text-navy-700">
                {message.copy}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-navy-950">
          Responsible sharing checklist
        </h2>
        <ul className="mt-4 grid gap-3 text-sm text-navy-700 sm:grid-cols-3">
          {[
            "Share with consent",
            "Never promise approval",
            "Send customer details only through the portal",
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export const metadata = { title: "Marketing materials" };
