import { PageTitle } from "@/components/page-title";

export const dynamic = "force-dynamic";

export default function LoanCasesPage() {
  return (
    <>
      <PageTitle title="Loan Cases" subtitle="Lender-by-lender loan pipeline" />
      <p className="text-navy-500">Loan cases coming next.</p>
    </>
  );
}
