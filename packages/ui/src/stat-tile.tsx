import type { ReactNode } from "react";
import { cx } from "./cx";

interface StatTileProps {
  label: string;
  value: ReactNode;
  sub?: string;
  /** Paint the value red — reserve for the single headline metric. */
  accent?: boolean;
}

export function StatTile({ label, value, sub, accent }: StatTileProps) {
  return (
    <div className="min-w-0 rounded-xl border border-hairline bg-white p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p
        className={cx(
          "mt-2 break-words font-display text-2xl font-extrabold tracking-tight tabular-nums min-[380px]:text-3xl",
          accent ? "text-red-600" : "text-navy-950",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-navy-500">{sub}</p>}
    </div>
  );
}
