import { cx } from "./cx";

export interface StatProps {
  value: string;
  label: string;
  /** Paint the numeral red — use sparingly, one per group. */
  accent?: boolean;
  className?: string;
}

/** Oversized ledger numeral. Inherits color; wrap in text-white on navy. */
export function Stat({ value, label, accent, className }: StatProps) {
  return (
    <div className={className}>
      <p
        className={cx(
          "font-display text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl",
          accent && "text-red-600",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-sm leading-snug opacity-65">{label}</p>
    </div>
  );
}
