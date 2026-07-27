import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("min-w-0 rounded-xl border border-hairline bg-white", className)}
      {...props}
    />
  );
}
