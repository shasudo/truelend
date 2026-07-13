import { cx } from "./cx";

/*
 * The TrueLend mark, redrawn as vector geometry from branding/*.jpeg:
 * a rounded hexagon, a bold north-east arrow (red), and a detached navy
 * corner triangle the arrow points into. Navy parts follow currentColor
 * so the mark flips to white on navy surfaces; red stays brand red.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cx("shrink-0", className)}>
      <path
        d="M50 6 88.1 28 88.1 72 50 94 11.9 72 11.9 28Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <polygon points="23.4,67.4 45.4,45.4 54.6,54.6 32.6,76.6" className="fill-red-600" />
      <polygon points="68,32 58.1,61.7 38.3,41.9" className="fill-red-600" />
      <polygon points="77,23 65,23 77,35" fill="currentColor" />
    </svg>
  );
}

export interface LogoProps {
  className?: string;
  tagline?: boolean;
}

/** Inherits color: wrap in `text-navy-800` on paper, `text-white` on navy. */
export function Logo({ className, tagline = false }: LogoProps) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={tagline ? "h-11 w-11" : "h-9 w-9"} />
      <span className="font-display leading-none">
        <span className="block text-[1.45rem] font-extrabold tracking-tight">
          True<span className="font-medium">Lend</span>
        </span>
        {tagline && (
          <span className="mt-1 block font-sans text-[0.5rem] font-medium uppercase tracking-[0.22em] opacity-65">
            Before You Borrow. Think <span className="text-red-600 opacity-100">TrueLend.</span>
          </span>
        )}
      </span>
    </span>
  );
}
