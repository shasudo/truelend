import Link from "next/link";
import { Card } from "@truelend/ui";
import { formatPaise } from "@truelend/reference";
import { PageTitle } from "@/components/page-title";
import { requireAdmin, getAuthContext } from "@/lib/auth";
import { getMisByProduct, getMisByChannel, getMisByPartner, type MisRow } from "@/lib/mis-queries";

export const dynamic = "force-dynamic";

function MisTable({ dimension, rows }: { dimension: string; rows: MisRow[] }) {
  const totals = rows.reduce(
    (a, r) => ({
      leads: a.leads + r.leads,
      cases: a.cases + r.cases,
      approved: a.approved + r.approved,
      declined: a.declined + r.declined,
      disbursed: a.disbursed + r.disbursed,
      disbursedVolumePaise: a.disbursedVolumePaise + r.disbursedVolumePaise,
      revenuePaise: a.revenuePaise + r.revenuePaise,
      payoutPaise: a.payoutPaise + r.payoutPaise,
      netPaise: a.netPaise + r.netPaise,
    }),
    {
      leads: 0,
      cases: 0,
      approved: 0,
      declined: 0,
      disbursed: 0,
      disbursedVolumePaise: 0,
      revenuePaise: 0,
      payoutPaise: 0,
      netPaise: 0,
    },
  );

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
            <th className="px-5 py-3 font-semibold">{dimension}</th>
            <th className="px-5 py-3 text-right font-semibold">Leads</th>
            <th className="px-5 py-3 text-right font-semibold">Cases</th>
            <th className="px-5 py-3 text-right font-semibold">Approved</th>
            <th className="px-5 py-3 text-right font-semibold">Declined</th>
            <th className="px-5 py-3 text-right font-semibold">Disbursed</th>
            <th className="px-5 py-3 text-right font-semibold">Volume</th>
            <th className="px-5 py-3 text-right font-semibold">Revenue</th>
            <th className="px-5 py-3 text-right font-semibold">Payout</th>
            <th className="px-5 py-3 text-right font-semibold">Net</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="px-5 py-12 text-center text-muted">
                No activity yet.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-hairline hover:bg-paper">
              <td className="px-5 py-3.5 font-medium text-navy-950">{r.label}</td>
              <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">{r.leads}</td>
              <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">{r.cases}</td>
              <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">{r.approved}</td>
              <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">{r.declined}</td>
              <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">{r.disbursed}</td>
              <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                {formatPaise(r.disbursedVolumePaise)}
              </td>
              <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                {formatPaise(r.revenuePaise)}
              </td>
              <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                {formatPaise(r.payoutPaise)}
              </td>
              <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-950">
                {formatPaise(r.netPaise)}
              </td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-navy-800/20 font-semibold text-navy-950">
              <td className="px-5 py-3.5">Total</td>
              <td className="px-5 py-3.5 text-right tabular-nums">{totals.leads}</td>
              <td className="px-5 py-3.5 text-right tabular-nums">{totals.cases}</td>
              <td className="px-5 py-3.5 text-right tabular-nums">{totals.approved}</td>
              <td className="px-5 py-3.5 text-right tabular-nums">{totals.declined}</td>
              <td className="px-5 py-3.5 text-right tabular-nums">{totals.disbursed}</td>
              <td className="px-5 py-3.5 text-right tabular-nums">
                {formatPaise(totals.disbursedVolumePaise)}
              </td>
              <td className="px-5 py-3.5 text-right tabular-nums">
                {formatPaise(totals.revenuePaise)}
              </td>
              <td className="px-5 py-3.5 text-right tabular-nums">
                {formatPaise(totals.payoutPaise)}
              </td>
              <td className="px-5 py-3.5 text-right tabular-nums">
                {formatPaise(totals.netPaise)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </Card>
  );
}

export default async function MisPage() {
  await requireAdmin();
  const { db } = getAuthContext();
  const [byProduct, byChannel, byPartner] = await Promise.all([
    getMisByProduct(db),
    getMisByChannel(db),
    getMisByPartner(db),
  ]);

  return (
    <>
      <PageTitle title="MIS" subtitle="Product-, channel- and referral-partner-wise performance" />

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-bold text-navy-950">By product</h2>
        <MisTable dimension="Product" rows={byProduct} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-bold text-navy-950">By channel</h2>
        <MisTable dimension="Channel" rows={byChannel} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-navy-950">By Referral Partner</h2>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.1em] text-navy-500">
                <th className="px-5 py-3 font-semibold">Referral Partner</th>
                <th className="px-5 py-3 text-right font-semibold">Leads</th>
                <th className="px-5 py-3 text-right font-semibold">Disbursed</th>
                <th className="px-5 py-3 text-right font-semibold">Volume</th>
                <th className="px-5 py-3 text-right font-semibold">Earned</th>
                <th className="px-5 py-3 text-right font-semibold">Paid</th>
                <th className="px-5 py-3 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {byPartner.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">
                    No Referral Partner-sourced leads yet.
                  </td>
                </tr>
              )}
              {byPartner.map((p) => (
                <tr key={p.key} className="border-b border-hairline last:border-b-0 hover:bg-paper">
                  <td className="px-5 py-3.5 font-medium text-navy-950">
                    <Link href={`/partners/${p.key}`} className="hover:text-red-600">
                      {p.label}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">{p.leads}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                    {p.disbursed}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                    {formatPaise(p.disbursedVolumePaise)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                    {formatPaise(p.earnedPaise)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-navy-700">
                    {formatPaise(p.paidPaise)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-navy-950">
                    {formatPaise(p.balancePaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </>
  );
}
export const metadata = { title: "MIS" };
