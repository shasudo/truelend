import { cx } from "./cx";

export interface RateTableRow {
  lender: string;
  /** e.g. "Bank" | "NBFC" */
  kind?: string;
  /** Pre-formatted, e.g. "8.35 – 9.15%" — rendered in tabular numerals. */
  rate: string;
  fee: string;
  tenure: string;
  amount?: string;
}

export interface RateTableProps {
  rows: RateTableRow[];
  /** Compact drops the fee column and tightens spacing (teasers). */
  compact?: boolean;
  className?: string;
}

/** Bank-wise comparison in the ledger style: hairline rows, tabular numerals. */
export function RateTable({ rows, compact, className }: RateTableProps) {
  const showAmount = !compact && rows.some((r) => r.amount);
  return (
    <div className={cx("overflow-x-auto rounded-xl border border-hairline bg-white", className)}>
      <table className="w-full min-w-[560px] text-left">
        <thead>
          <tr className="border-b border-hairline text-xs font-semibold uppercase tracking-[0.12em] text-navy-500">
            <th className="px-5 py-3.5 font-semibold">Lender</th>
            <th className="px-5 py-3.5 font-semibold">Interest rate (p.a.)</th>
            {!compact && <th className="px-5 py-3.5 font-semibold">Processing fee</th>}
            <th className="px-5 py-3.5 font-semibold">Max tenure</th>
            {showAmount && <th className="px-5 py-3.5 font-semibold">Max amount</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.lender}
              className="border-b border-hairline transition-colors last:border-b-0 hover:bg-paper"
            >
              <td className={cx("px-5 font-medium text-navy-950", compact ? "py-3" : "py-4")}>
                {row.lender}
                {row.kind && (
                  <span className="ml-2 text-xs font-normal uppercase tracking-wide text-navy-400">
                    {row.kind}
                  </span>
                )}
              </td>
              <td
                className={cx(
                  "px-5 font-display font-bold tabular-nums text-navy-950",
                  compact ? "py-3" : "py-4",
                )}
              >
                {row.rate}
              </td>
              {!compact && <td className="px-5 py-4 tabular-nums text-navy-600">{row.fee}</td>}
              <td className={cx("px-5 tabular-nums text-navy-600", compact ? "py-3" : "py-4")}>
                {row.tenure}
              </td>
              {showAmount && (
                <td className="px-5 py-4 tabular-nums text-navy-600">{row.amount ?? "—"}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
