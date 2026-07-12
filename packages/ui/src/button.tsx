import type { ButtonHTMLAttributes } from "react";
import { Slot } from "radix-ui";
import { cx } from "./cx";

const variants = {
  primary: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  secondary: "bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900",
  outline:
    "border border-navy-800/25 bg-transparent text-navy-800 hover:border-navy-800/60 hover:bg-navy-800/[0.04]",
  "outline-inverse":
    "border border-white/30 bg-transparent text-white hover:border-white/70 hover:bg-white/10",
  ghost: "bg-transparent text-navy-800 hover:bg-navy-800/[0.06]",
} as const;

const sizes = {
  sm: "h-9 gap-1.5 px-4 text-sm",
  md: "h-11 gap-2 px-6 text-[0.95rem]",
  lg: "h-13 gap-2 px-7 text-base",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Render the child element (e.g. a Next <Link>) instead of a <button>. */
  asChild?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  className,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cx(
        "inline-flex select-none items-center justify-center rounded-lg font-semibold transition-colors duration-150",
        "outline-offset-2 outline-red-600 focus-visible:outline-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
