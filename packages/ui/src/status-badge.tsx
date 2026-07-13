import { cx } from "./cx";

const styles: Record<string, string> = {
  new: "border border-navy-800/25 text-navy-600",
  contacted: "bg-navy-800/[0.08] text-navy-700",
  qualified: "bg-navy-800/[0.08] text-navy-700",
  docs_collected: "bg-navy-800/[0.08] text-navy-700",
  logged_in: "bg-navy-800/[0.12] text-navy-800",
  approved: "bg-navy-800 text-white",
  disbursed: "bg-navy-900 text-white",
  declined: "bg-red-50 text-red-700",
  lost: "bg-red-50 text-red-700",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        styles[status] ?? "bg-navy-800/[0.08] text-navy-700",
      )}
    >
      {label}
    </span>
  );
}
