import { cx } from "./cx";

export interface StatProps {
  value: string;
  label: string;
  /** Paint the numeral red — use sparingly, one per group. */
  accent?: boolean;
  /** Append an indicative-figure asterisk tied to a `*` footnote. */
  mark?: boolean;
  className?: string;
}

/** Oversized ledger numeral. Inherits color; wrap in text-white on navy. */
export function Stat({ value, label, accent, mark, className }: StatProps) {
  return (
    <div className={className}>
      <p
        className={cx(
          "font-display text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl",
          accent && "text-red-600",
        )}
      >
        {value}
        {mark && (
          <sup aria-hidden className="ml-0.5 text-[0.5em] font-normal text-red-600">
            *
          </sup>
        )}
      </p>
      <p className="mt-1.5 text-sm leading-snug opacity-65">{label}</p>
    </div>
  );
}
