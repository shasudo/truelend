import { cx } from "./cx";

/*
 * The TrueLend mark, traced from branding/*.jpeg: a rounded hexagon, a bold
 * north-east arrow (red) rising from the lower-left, and the detached navy pin
 * (right triangle) tucked into the arrowhead's upper-right. Navy parts follow
 * currentColor so the mark flips to white on navy surfaces; red stays brand red.
 * Rounded corners come from a same-color round-join stroke on each fill.
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
      <polygon
        points="35.5,72.4 37,72.4 53.2,55.8 56.6,58.8 57.6,71.9 68.4,72.4 69.9,70.9 69.9,55.3 45.8,31.1 30.6,31.1 28.6,33.2 29.1,42.7 41.9,43.2 45.3,46.7 28.6,64.3"
        strokeWidth="3.2"
        strokeLinejoin="round"
        className="fill-red-600 stroke-red-600"
      />
      <polygon
        points="69.9,46.7 69.9,31.1 54.7,31.1"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
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
