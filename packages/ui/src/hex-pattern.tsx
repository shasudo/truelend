import { cx } from "./cx";

/**
 * Decorative nested-hexagon motif echoing the logo. Color via currentColor;
 * size/position/opacity via className. Always aria-hidden.
 */
export function HexPattern({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
      className={cx("pointer-events-none absolute", className)}
    >
      <path
        d="M200 12 363 106 363 294 200 388 37 294 37 106Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M200 64 318 132 318 268 200 336 82 268 82 132Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path
        d="M200 118 271 159 271 241 200 282 129 241 129 159Z"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinejoin="round"
        opacity="0.3"
      />
    </svg>
  );
}
