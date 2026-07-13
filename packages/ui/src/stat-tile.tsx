import type { ReactNode } from "react";
import { cx } from "./cx";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  sub?: string;
  /** Paint the value red — reserve for the single headline metric. */
  accent?: boolean;
}

export function StatTile({ label, value, sub, accent }: StatTileProps) {
  return (
    <div className="rounded-xl border border-hairline bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-navy-400">{label}</p>
      <p
        className={cx(
          "mt-2 font-display text-3xl font-extrabold tracking-tight tabular-nums",
          accent ? "text-red-600" : "text-navy-950",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-navy-500">{sub}</p>}
    </div>
  );
}
