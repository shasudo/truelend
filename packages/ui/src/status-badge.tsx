import { cx } from "./cx";

export type StatusBadgeTone = "neutral" | "info" | "emphasis" | "success" | "danger";

const styles: Record<StatusBadgeTone, string> = {
  neutral: "border border-navy-800/25 text-navy-600",
  info: "bg-navy-800/[0.08] text-navy-700",
  emphasis: "bg-navy-800/[0.12] text-navy-800",
  success: "bg-navy-900 text-white",
  danger: "bg-red-50 text-red-700",
};

export function StatusBadge({
  tone = "neutral",
  label,
}: {
  tone?: StatusBadgeTone;
  label: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[tone],
      )}
    >
      {label}
    </span>
  );
}
