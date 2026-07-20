import type { HTMLAttributes } from "react";
import { cx } from "./cx";

const variants = {
  navy: "bg-navy-800/[0.07] text-navy-700",
  red: "bg-red-50 text-red-700",
  outline: "border border-hairline text-navy-600",
} as const;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ variant = "navy", className, ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
