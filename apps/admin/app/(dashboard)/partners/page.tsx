import Link from "next/link";
import { Card } from "@truelend/ui";
import { partnerStatusLabel, formatDate } from "@truelend/reference";
import { schema } from "@truelend/db";
import { PageTitle } from "@/components/page-title";
import { requireAdmin, getAuthContext } from "@/lib/auth";
import { listPartners } from "@/lib/partner-queries";
import { cx } from "@truelend/ui";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const statusStyles: Record<string, string> = {
  pending: "bg-navy-800/[0.08] text-navy-700",
  verified: "bg-navy-800 text-white",
  rejected: "bg-red-50 text-red-700",
};

export default async function PartnersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const rawStatus = typeof sp.status === "string" ? sp.status : undefined;
  const status = (schema.partnerStatus.enumValues as readonly string[]).includes(rawStatus ?? "")
    ? rawStatus
    : undefined;

  const { db } = getAuthContext();
  const partners = await listPartners(db, status);

  const tabs = [
    { label: "All", value: undefined as string | undefined },
    { label: "Pending", value: "pending" },
    { label: "Verified", value: "verified" },
    { label: "Rejected", value: "rejected" },
  ];

  return (
    <>
      <PageTitle title="Referral Partners" subtitle="Referral Partner accounts" />

      <div className="mb-6 flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.value ? `/partners?status=${t.value}` : "/partners"}
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
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Docs</th>
              <th className="px-5 py-3 text-right font-semibold">Leads</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted">
                  No Referral Partners{status ? ` with status "${status}"` : ""} yet.
                </td>
              </tr>
            )}
            {partners.map((p) => (
              <tr
                key={p.userId}
                className="border-b border-hairline last:border-b-0 hover:bg-paper"
              >
                <td className="px-5 py-3.5">
                  <Link
                    href={`/partners/${p.userId}`}
                    className="font-semibold text-navy-950 hover:text-red-600"
                  >
                    {p.name}
                  </Link>
                  <div className="text-xs text-muted">{p.email}</div>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={cx(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      statusStyles[p.status],
                    )}
                  >
                    {partnerStatusLabel(p.status)}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-navy-600">{p.docCount}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-navy-600">{p.leadCount}</td>
                <td className="px-5 py-3.5 tabular-nums text-navy-500">
                  {formatDate(p.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
export const metadata = { title: "Referral Partners" };
