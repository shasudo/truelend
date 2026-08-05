import type { TimePoint, NamedCount } from "@/lib/mis-queries";

const WIDTH = 720;
const HEIGHT = 220;
const PLOT = { left: 36, right: 12, top: 12, bottom: 32 };

interface EmptyProps {
  label: string;
}

function Empty({ label }: EmptyProps) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted">{label}</div>
  );
}

const shortDay = (day: string) =>
  new Date(`${day}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

interface TrendChartProps {
  data: TimePoint[];
  /*
   * Namespaces the gradient and the a11y title/desc. Two charts on one page
   * would otherwise share `lead-trend-*` ids — duplicate DOM ids, and the
   * second chart's fill silently resolving to the first one's gradient.
   */
  id?: string;
  /** What the series counts, e.g. "leads" or "call tasks". */
  noun?: string;
}

/** Server-rendered SVG keeps the trend visual without shipping a chart runtime. */
export function TrendChart({ data, id = "lead-trend", noun = "leads" }: TrendChartProps) {
  if (data.length === 0) return <Empty label={`No ${noun} in the last 30 days`} />;
  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const max = Math.max(1, ...data.map((point) => point.count));
  const points = data.map((point, index) => ({
    ...point,
    x: PLOT.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth),
    y: PLOT.top + plotHeight - (point.count / max) * plotHeight,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `M ${PLOT.left} ${PLOT.top + plotHeight} L ${line.replaceAll(" ", " L ")} L ${PLOT.left + plotWidth} ${PLOT.top + plotHeight} Z`;
  const labels = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[220px] w-full"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
      >
        <title id={`${id}-title`}>
          {noun.charAt(0).toUpperCase() + noun.slice(1)} over the last 30 days
        </title>
        <desc id={`${id}-desc`}>
          Daily {noun} counts. The highest daily count is {max}.
        </desc>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14204a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#14204a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => {
          const y = PLOT.top + plotHeight * ratio;
          return (
            <g key={ratio}>
              <line
                x1={PLOT.left}
                x2={PLOT.left + plotWidth}
                y1={y}
                y2={y}
                stroke="rgba(20,32,74,0.08)"
              />
              <text
                x={PLOT.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-navy-400 text-[11px]"
              >
                {Math.round(max * (1 - ratio))}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#${id}-fill)`} />
        <polyline
          points={line}
          fill="none"
          stroke="#14204a"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {labels.map((index) => {
          const point = points[index];
          if (!point) return null;
          return (
            <text
              key={point.day}
              x={point.x}
              y={HEIGHT - 8}
              textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
              className="fill-navy-400 text-[11px]"
            >
              {shortDay(point.day)}
            </text>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        {data.map((point) => `${shortDay(point.day)}: ${point.count} ${noun}`).join("; ")}
      </figcaption>
    </figure>
  );
}

interface CategoryBarsProps {
  data: NamedCount[];
  /** What the bars count — read out before the list on a screen reader. */
  label?: string;
}

/** Exact labels and values stay visible and screen-reader friendly. */
export function CategoryBars({ data, label = "Lead counts" }: CategoryBarsProps) {
  if (data.length === 0) return <Empty label="No data yet" />;
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <ul className="space-y-3" aria-label={label}>
      {data.map((item) => (
        <li
          key={item.name}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[minmax(7rem,1fr)_minmax(8rem,2fr)_3rem] sm:items-center sm:gap-3"
        >
          <span className="min-w-0 truncate text-navy-600" title={item.name}>
            {item.name}
          </span>
          <span className="col-span-2 row-start-2 h-4 overflow-hidden rounded-r bg-navy-800/[0.06] sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <span
              className="block h-full min-w-0.5 rounded-r bg-navy-800"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </span>
          <span className="col-start-2 row-start-1 text-right tabular-nums font-medium text-navy-800 sm:col-start-3">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}
