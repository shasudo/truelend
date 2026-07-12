import type { Metadata } from "next";
import { Container } from "@truelend/ui";
import { PageHeader } from "@/components/page-header";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Privacy Policy" };

// PLACEHOLDER legal copy — must be replaced by counsel-approved text before
// campaigns run (todo.md).
export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        lede="How TrueLend collects, uses and protects your information."
      />
      <Container className="max-w-3xl space-y-8 py-16 leading-relaxed text-navy-700">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-navy-950">What we collect</h2>
          <p>
            When you submit an enquiry, referral or contact request, we collect the details you
            provide — name, phone number, email, city and the product you&rsquo;re interested in —
            along with basic campaign attribution (how you found us).
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-navy-950">How we use it</h2>
          <p>
            Your information is used to advise you on credit products, to share your file with a
            lender <em>only after your explicit consent</em>, and to keep you informed about the
            status of your application. We do not sell your data.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-navy-950">Retention & rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at any time
            by writing to {site.email}. We retain records only as long as required to serve you and
            to meet our legal obligations.
          </p>
        </section>
        <p className="border-t border-hairline pt-6 text-sm text-navy-400">
          This is interim policy text pending formal legal review. Last updated July 2026.
        </p>
      </Container>
    </>
  );
}
