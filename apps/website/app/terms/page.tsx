import type { Metadata } from "next";
import { Container } from "@truelend/ui";
import { PageHeader } from "@/components/page-header";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  alternates: { canonical: "/terms" },
};

// PLACEHOLDER legal copy — must be replaced by counsel-approved text before
// campaigns run (todo.md).
export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Use"
        lede="The ground rules for using the TrueLend platform."
      />
      <Container className="max-w-3xl space-y-8 py-16 leading-relaxed text-navy-700">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-navy-950">Who we are</h2>
          <p>
            TrueLend is a loan distribution and advisory platform. We are not a lender: credit
            decisions, sanction terms and disbursement rest solely with the respective bank or NBFC.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-navy-950">Indicative information</h2>
          <p>
            Interest rates, fees, eligibility norms and turnaround times shown on this website are
            indicative, provided for comparison, and subject to change by lenders without notice.
            Nothing on this site constitutes a sanction, offer or guarantee of credit.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-navy-950">Your responsibilities</h2>
          <p>
            You agree to provide accurate information in enquiries and applications. Misstated
            income, obligations or identity can result in rejection by lenders and termination of
            our services.
          </p>
        </section>
        <p className="border-t border-hairline pt-6 text-sm text-muted">
          Questions about these terms? Write to {site.email}. This is interim text pending formal
          legal review. Last updated July 2026.
        </p>
      </Container>
    </>
  );
}
