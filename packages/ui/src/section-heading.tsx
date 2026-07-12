import { cx } from "./cx";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  center?: boolean;
  /** For navy surfaces — flips text to light. */
  inverse?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  center,
  inverse,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cx("max-w-2xl", center && "mx-auto text-center", className)}>
      {eyebrow && (
        <p
          className={cx(
            "flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-red-600",
            center && "justify-center",
          )}
        >
          {!center && <span aria-hidden className="h-px w-8 bg-red-600" />}
          {eyebrow}
        </p>
      )}
      <h2
        className={cx(
          "mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl",
          inverse ? "text-white" : "text-navy-950",
        )}
      >
        {title}
      </h2>
      {lede && (
        <p className={cx("mt-4 leading-relaxed", inverse ? "text-white/70" : "text-navy-600")}>
          {lede}
        </p>
      )}
    </div>
  );
}
