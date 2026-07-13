"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { TimePoint, NamedCount } from "@/lib/mis-queries";

// Single brand hue — these are single-series magnitude/trend charts, so no
// categorical palette (and no CVD concern). Navy mark on white surface.
const NAVY = "#14204a";
const GRID = "rgba(20,32,74,0.08)";
const AXIS = "#6d7dac";

const tooltip = {
  contentStyle: {
    background: "#fff",
    border: "1px solid rgba(20,32,74,0.12)",
    borderRadius: 12,
    fontSize: 12,
    boxShadow: "0 8px 30px -12px rgba(20,32,74,0.25)",
  },
  labelStyle: { color: "#14204a", fontWeight: 600 },
  itemStyle: { color: "#46578f" },
} as const;

const axisProps = {
  tick: { fill: AXIS, fontSize: 12 },
  axisLine: false,
  tickLine: false,
} as const;

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-navy-300">{label}</div>
  );
}

const shortDay = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function TrendChart({ data }: { data: TimePoint[] }) {
  if (data.length === 0) return <Empty label="No leads in the last 30 days" />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={NAVY} stopOpacity={0.18} />
            <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tickFormatter={shortDay} {...axisProps} minTickGap={24} />
        <YAxis allowDecimals={false} width={32} {...axisProps} />
        <Tooltip {...tooltip} labelFormatter={(d) => shortDay(String(d))} />
        <Area
          type="monotone"
          dataKey="count"
          name="Leads"
          stroke={NAVY}
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={false}
          activeDot={{ r: 4, fill: NAVY }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars({ data }: { data: NamedCount[] }) {
  if (data.length === 0) return <Empty label="No data yet" />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axisProps} />
        <YAxis type="category" dataKey="name" width={110} {...axisProps} />
        <Tooltip {...tooltip} cursor={{ fill: "rgba(20,32,74,0.04)" }} />
        <Bar dataKey="count" name="Leads" fill={NAVY} radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
