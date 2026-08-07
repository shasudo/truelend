import Link from "next/link";
import type { Metadata } from "next";
import { Card, cx } from "@truelend/ui";
import {
  bankApplyLeadStatusLabels,
  bankApplyLeadStatusValues,
  bankApplyProductForSlug,
  formatDate,
} from "@truelend/reference";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { BankLeadCsvImport } from "@/components/bank-lead-forms";
import { requireAdmin, getAuthContext } from "@/lib/auth";
import { listBankLeads } from "@/lib/bank-lead-queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Card Referrals" };

type SP = Record<string, string | string[] | undefined>;

export default async function BankLeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const rawStatus = typeof sp.status === "string" ? sp.status : undefined;
  const status = (bankApplyLeadStatusValues as readonly string[]).includes(rawStatus ?? "")
    ? rawStatus
    : undefined;

  const { db } = getAuthContext();
  const leads = await listBankLeads(db, status);

  const tabs = [
    { label: "All", value: undefined as string | undefined },
    ...bankApplyLeadStatusValues.map((value) => ({
      label: bankApplyLeadStatusLabels[value] ?? value,
      value,
    })),
  ];

  return (
    <>
      <PageTitle
        title="Card Referrals"
        subtitle="QR quick-apply leads, reconciled against bank status exports"
      />

      <div className="mb-4 flex gap-2">
        <span className="rounded-lg bg-navy-800 px-3.5 py-1.5 text-sm font-medium text-white">
          IndusInd
        </span>
        <Link
          href="/bank-leads/hdfc"
          className="rounded-lg border border-hairline px-3.5 py-1.5 text-sm font-medium text-navy-600 transition-colors hover:border-navy-800/40"
        >
          HDFC
        </Link>
      </div>

      <BankLeadCsvImport defaultBank="indusind" />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.value ? `/bank-leads?status=${t.value}` : "/bank-leads"}
            className={cx(
              "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              status === t.value
                ? "bg-navy-800 text-white"
                : "border border-hairline text-navy-600 hover:border-navy-800/40",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card className="max-w-full overscroll-x-contain overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
              <th className="px-5 py-3 font-semibold">Partner</th>
              <th className="px-5 py-3 font-semibold">Phone</th>
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-5 py-3 font-semibold">Tracking code</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Bank stage</th>
              <th className="px-5 py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted">
                  No card referrals{status ? ` with status "${status}"` : ""} yet.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-hairline last:border-b-0 hover:bg-paper">
                <td className="px-5 py-3.5">
                  {lead.partnerName ? (
                    <>
                      <span className="font-semibold text-navy-950">{lead.partnerName}</span>
                      <div className="text-xs text-muted">{lead.partnerReferenceId}</div>
                    </>
                  ) : (
                    <span className="text-muted">Direct</span>
                  )}
                </td>
                <td className="px-5 py-3.5 tabular-nums text-navy-700">{lead.phone}</td>
                <td className="px-5 py-3.5 text-navy-700">
                  {bankApplyProductForSlug(lead.productSlug)?.label ?? lead.productSlug}
                </td>
                <td className="px-5 py-3.5 tabular-nums text-navy-500">{lead.trackingCode}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={lead.status} kind="bank" />
                </td>
                <td className="px-5 py-3.5 text-navy-600">{lead.bankStage ?? "—"}</td>
                <td className="px-5 py-3.5 tabular-nums text-navy-500">
                  {formatDate(lead.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
