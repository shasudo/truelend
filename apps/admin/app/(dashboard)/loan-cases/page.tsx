import Link from "next/link";
import { Card } from "@truelend/ui";
import { productName, bankName } from "@truelend/reference";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { getAuthContext } from "@/lib/auth";
import { listLoanCases } from "@/lib/loan-queries";
import { formatDate, formatPaise } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LoanCasesPage() {
  const { db } = getAuthContext();
  const cases = await listLoanCases(db);

  return (
    <>
      <PageTitle
        title="Loan Cases"
        subtitle={`${cases.length} ${cases.length === 1 ? "case" : "cases"} across all lenders`}
      />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
              <th className="px-5 py-3 font-semibold">Borrower</th>
              <th className="px-5 py-3 font-semibold">Lender</th>
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Disbursed</th>
              <th className="px-5 py-3 text-right font-semibold">Revenue</th>
              <th className="px-5 py-3 font-semibold">Opened</th>
            </tr>
          </thead>
          <tbody>
            {cases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-navy-400">
                  No loan cases yet — create one from a lead.
                </td>
              </tr>
            )}
            {cases.map((c) => (
              <tr key={c.id} className="border-b border-hairline last:border-b-0 hover:bg-paper">
                <td className="px-5 py-3.5">
                  <Link
                    href={`/loan-cases/${c.id}`}
                    className="font-semibold text-navy-950 hover:text-red-600"
                  >
                    {c.leadName ?? "—"}
                  </Link>
                </td>
                <td className="px-5 py-3.5 text-navy-600">{bankName(c.lenderSlug)}</td>
                <td className="px-5 py-3.5 text-navy-600">{productName(c.productSlug)}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={c.status} kind="case" />
                </td>
                <td className="px-5 py-3.5 text-right font-medium tabular-nums text-navy-900">
                  {formatPaise(c.disbursedAmountPaise)}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-navy-600">
                  {formatPaise(c.revenuePaise)}
                </td>
                <td className="px-5 py-3.5 tabular-nums text-navy-500">
                  {formatDate(c.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
