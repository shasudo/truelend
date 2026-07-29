import type { ReactNode } from "react";

interface PageTitleProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageTitle({ title, subtitle, actions }: PageTitleProps) {
  return (
    <div className="mb-7 flex min-w-0 flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0 flex-1">
        <h1 className="break-words font-display text-2xl font-extrabold tracking-tight text-navy-950">
          {title}
        </h1>
        {subtitle && <p className="mt-1 break-words text-sm text-navy-500">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex w-full max-w-full flex-wrap gap-2 min-[480px]:w-auto">{actions}</div>
      )}
    </div>
  );
}
