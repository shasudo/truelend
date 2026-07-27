import type { ReactNode } from "react";

export function PartnerPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-red-600">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-navy-600 sm:text-base">{description}</p>
      </div>
      {action && (
        <div className="w-full min-[480px]:w-auto [&>*]:w-full min-[480px]:[&>*]:w-auto">
          {action}
        </div>
      )}
    </div>
  );
}
