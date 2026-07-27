import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("mx-auto min-w-0 w-full max-w-6xl px-4 min-[400px]:px-5 sm:px-8", className)}
      {...props}
    />
  );
}
