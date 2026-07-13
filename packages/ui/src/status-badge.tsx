import { cx } from "./cx";

// Lead + loan-case statuses in the navy/red palette: fresh = outline,
// in-progress = soft navy, won = solid navy, lost/declined = red. Keyed by the
// raw status string so one map serves both enums (shared by admin + partners).
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

/** Color-coded status pill. `status` picks the color; `label` is the text. */
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
