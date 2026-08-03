import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card, Select, cx } from "@truelend/ui";
import {
  banks,
  productName,
  bankName,
  loanCaseStatusLabels,
  formatDate,
  formatPaise,
} from "@truelend/reference";
import { schema } from "@truelend/db";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { getAuthContext, requireStaff, scopeFor } from "@/lib/auth";
import { listLoanCases, type LoanCaseFilters, type LoanCaseStatus } from "@/lib/loan-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Loan cases" };

type SP = Record<string, string | string[] | undefined>;

function str(sp: SP, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

function parseFilters(sp: SP): LoanCaseFilters {
  const status = str(sp, "status");
  const lender = str(sp, "lender");
  return {
    status: (schema.loanCaseStatus.enumValues as readonly string[]).includes(status ?? "")
      ? (status as LoanCaseStatus)
      : undefined,
    lender: banks.some((b) => b.slug === lender) ? lender : undefined,
    page: Math.max(1, Number(str(sp, "page")) || 1),
  };
}

function queryString(f: LoanCaseFilters, page: number): string {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.lender) p.set("lender", f.lender);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function LoanCasesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const hasFilters = Boolean(filters.status || filters.lender);
  const session = await requireStaff();
  const { db } = getAuthContext();
  const { rows, total, page, pageCount } = await listLoanCases(db, scopeFor(session), filters);

  return (
    <>
      <PageTitle
        title="Loan Cases"
        subtitle={`${total} ${total === 1 ? "case" : "cases"} across all lenders`}
      />

      <Card className="mb-6 p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select name="status" defaultValue={filters.status ?? ""} aria-label="Status">
            <option value="">Any status</option>
            {schema.loanCaseStatus.enumValues.map((s) => (
              <option key={s} value={s}>
                {loanCaseStatusLabels[s]}
              </option>
            ))}
          </Select>
          <Select name="lender" defaultValue={filters.lender ?? ""} aria-label="Lender">
            <option value="">Any lender</option>
            {banks.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" size="sm">
              Apply filters
            </Button>
            <Button type="button" variant="ghost" size="sm" asChild>
              <Link href="/loan-cases">Clear</Link>
            </Button>
          </div>
        </form>
      </Card>

      <Card className="max-w-full overscroll-x-contain overflow-x-auto">
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted">
                  {hasFilters
                    ? "No loan cases match these filters."
                    : "No loan cases yet — create one from a lead."}
                </td>
              </tr>
            )}
            {rows.map((c) => (
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

      {pageCount > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm text-navy-500">
          <span>
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {/* asChild disabled doesn't inert an anchor — kill pointer + focus explicitly. */}
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cx(page <= 1 && "pointer-events-none opacity-50")}
            >
              <Link
                href={`/loan-cases${queryString(filters, page - 1)}`}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cx(page >= pageCount && "pointer-events-none opacity-50")}
            >
              <Link
                href={`/loan-cases${queryString(filters, page + 1)}`}
                aria-disabled={page >= pageCount}
                tabIndex={page >= pageCount ? -1 : undefined}
              >
                Next <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
