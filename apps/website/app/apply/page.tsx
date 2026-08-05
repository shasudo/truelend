import type { Metadata } from "next";
import { Container } from "@truelend/ui";
import { PageHeader } from "@/components/page-header";
import { QuickApplyFlow } from "@/components/forms/quick-apply-flow";
import { refFromSearch } from "@/lib/attribution";

export const metadata: Metadata = {
  title: "Apply Now",
  robots: { index: false, follow: false },
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams(
    Object.entries(await searchParams).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, Array.isArray(value) ? (value[0] ?? "") : value]],
    ),
  );
  const refCode = refFromSearch(params);

  return (
    <>
      <PageHeader
        eyebrow="Quick apply"
        title="Enter Your Number to Get Started"
        lede="Share your mobile number, pick a product, and you'll be taken straight to the bank's own application page."
      />
      <Container className="max-w-3xl py-8 sm:py-10">
        <QuickApplyFlow refCode={refCode} />
      </Container>
    </>
  );
}
