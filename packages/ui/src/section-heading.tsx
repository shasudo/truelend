import { cx } from "./cx";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  center?: boolean;
  /** For navy surfaces — flips text to light. */
  inverse?: boolean;
  /** Override eyebrow color (default red); the leading rule follows via bg-current. */
  eyebrowClassName?: string;
  /** Override title color (default navy / white on inverse). */
  titleClassName?: string;
  /** Override lede typography while retaining semantic default colors. */
  ledeClassName?: string;
  /** Heading level. Page-level headers pass "h1"; in-page sections keep h2 so
   *  each page has exactly one h1. */
  as?: "h1" | "h2";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  center,
  inverse,
  eyebrowClassName,
  titleClassName,
  ledeClassName,
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <div className={cx("max-w-2xl", center && "mx-auto text-center", className)}>
      {eyebrow && (
        <p
          className={cx(
            "flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em]",
            eyebrowClassName ?? "text-red-600",
            center && "justify-center",
          )}
        >
          {!center && <span aria-hidden className="h-px w-8 bg-current" />}
          {eyebrow}
        </p>
      )}
      <Heading
        className={cx(
          "mt-3 text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl",
          titleClassName ?? (inverse ? "text-white" : "text-navy-950"),
        )}
      >
        {title}
      </Heading>
      {lede && (
        <p
          className={cx(
            "mt-4 leading-relaxed",
            inverse ? "text-white/70" : "text-navy-600",
            ledeClassName,
          )}
        >
          {lede}
        </p>
      )}
    </div>
  );
}
