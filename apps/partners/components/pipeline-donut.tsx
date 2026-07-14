import { leadStatusLabels } from "@truelend/reference";
import type { PipelineStage } from "@/lib/dashboard-queries";

export interface DonutSlice {
  label: string;
  count: number;
  color: string;
}

export interface DonutArc extends DonutSlice {
  len: number;
  offset: number;
  pct: number;
}

/**
 * Turn slices into positioned donut arcs. `len` is the arc length along the
 * circle, `offset` its cumulative start; both feed stroke-dasharray/offset.
 * Pure so the arc math has a unit check (pipeline-donut.test.ts).
 */
export function donutArcs(slices: DonutSlice[], circumference: number): DonutArc[] {
  const total = slices.reduce((sum, s) => sum + s.count, 0);
  let offset = 0;
  return slices.map((s) => {
    const frac = total > 0 ? s.count / total : 0;
    const arc = { ...s, len: frac * circumference, offset, pct: Math.round(frac * 100) };
    offset += arc.len;
    return arc;
  });
}

// Pipeline order and an on-brand navy→sun→red ramp (the theme has no other hues).
const STAGE_ORDER = [
  "new",
  "contacted",
  "qualified",
  "docs_collected",
  "logged_in",
  "approved",
  "disbursed",
  "declined",
  "lost",
] as const;

const STAGE_COLOR: Record<string, string> = {
  new: "#9ba7c9",
  contacted: "#6d7dac",
  qualified: "#46578f",
  docs_collected: "#2d3d74",
  logged_in: "#eeb800",
  approved: "#14204a",
  disbursed: "#0d1637",
  declined: "#e0212b",
  lost: "#ce0e17",
};

export function PipelineDonut({ stages }: { stages: PipelineStage[] }) {
  const slices: DonutSlice[] = STAGE_ORDER.flatMap((status) => {
    const stage = stages.find((s) => s.status === status);
    if (!stage || stage.count === 0) return [];
    return [
      {
        label: leadStatusLabels[status] ?? status,
        count: stage.count,
        color: STAGE_COLOR[status] ?? "#46578f",
      },
    ];
  });

  const total = slices.reduce((sum, s) => sum + s.count, 0);
  const size = 190;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arcs = donutArcs(slices, c);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`Pipeline distribution across ${total} cases`}
        >
          {total === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#14204a14"
              strokeWidth={stroke}
            />
          ) : (
            arcs.map((arc) => (
              <circle
                key={arc.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={arc.color}
                strokeWidth={stroke}
                strokeDasharray={`${arc.len} ${c - arc.len}`}
                strokeDashoffset={-arc.offset}
              />
            ))
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-extrabold tabular-nums text-navy-950">
            {total}
          </span>
          <span className="text-xs font-semibold text-muted">{total === 1 ? "Case" : "Cases"}</span>
        </div>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted">No cases in your pipeline yet.</p>
      ) : (
        <ul className="w-full space-y-2.5">
          {arcs.map((arc) => (
            <li key={arc.label} className="flex items-center gap-3 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: arc.color }}
                aria-hidden
              />
              <span className="flex-1 truncate text-navy-700">{arc.label}</span>
              <span className="font-semibold tabular-nums text-navy-950">{arc.count}</span>
              <span className="w-11 text-right text-xs tabular-nums text-muted">{arc.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
