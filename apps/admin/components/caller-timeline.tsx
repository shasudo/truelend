import type { CallerTimeline } from "@/lib/crm-analytics-queries";

/*
 * Who dialled, on which day — one row per caller, one cell per IST day, shaded
 * by how many outcomes they logged.
 *
 * A grid rather than a line per caller: with more than two or three people the
 * lines cross into noise, while the thing anyone actually reads off this — a row
 * that goes pale on Wednesday and never recovers, or a single dark row carrying
 * a whole team — is a pattern the eye finds instantly in a grid.
 *
 * Server-rendered divs, no chart runtime and no client JS. Colour is not the
 * only channel: every cell carries its exact count for screen readers and as a
 * hover title, and the row total is rendered as text.
 */

const shortDay = (day: string) =>
  new Date(`${day}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

/**
 * Square-rooted so a single 60-call day doesn't wash every ordinary 8-call day
 * out to near-white. The floor keeps a day with one logged call visibly
 * different from a day with none, which is the distinction that matters most.
 */
function shade(count: number, peak: number): string {
  if (count === 0) return "rgba(20,32,74,0.05)";
  const intensity = Math.sqrt(count / peak);
  return `rgba(20,32,74,${(0.18 + intensity * 0.72).toFixed(3)})`;
}

export function CallerTimelineGrid({ days, rows, peak }: CallerTimeline) {
  if (rows.length === 0 || days.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No callers in this period.</p>;
  }

  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain">
      <table
        className="w-full border-separate border-spacing-0 text-sm"
        style={{ minWidth: `${240 + days.length * 26}px` }}
      >
        <caption className="sr-only">
          Call outcomes logged per caller per day, {shortDay(days[0]!)} to{" "}
          {shortDay(days[days.length - 1]!)}.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 bg-white pb-2 pr-3 text-left font-semibold">
              <span className="text-xs uppercase tracking-[0.1em] text-navy-500">Caller</span>
            </th>
            {days.map((day, index) => (
              <th key={day} scope="col" className="pb-2 align-bottom">
                {/* Every label would collide at this column width, so only the
                    ends and the middle are printed; the rest stay in the cell
                    titles and the screen-reader text. */}
                <span className="block text-center text-[10px] tabular-nums text-navy-400">
                  {index === 0 || index === days.length - 1 || index === Math.floor(days.length / 2)
                    ? shortDay(day)
                    : ""}
                </span>
              </th>
            ))}
            <th scope="col" className="pb-2 pl-3 text-right">
              <span className="text-xs uppercase tracking-[0.1em] text-navy-500">Total</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((caller) => (
            <tr key={caller.id}>
              <th scope="row" className="sticky left-0 max-w-[13rem] bg-white py-1 pr-3 text-left">
                <span className="block truncate font-medium text-navy-950">{caller.name}</span>
                <span className="block truncate text-xs text-muted">{caller.email}</span>
              </th>
              {caller.counts.map((count, index) => (
                <td key={days[index]} className="p-[2px]">
                  <span
                    className="block h-6 rounded-[3px]"
                    style={{ backgroundColor: shade(count, peak) }}
                    title={`${caller.name} · ${shortDay(days[index]!)} · ${count} ${count === 1 ? "call" : "calls"}`}
                  >
                    <span className="sr-only">
                      {shortDay(days[index]!)}: {count}
                    </span>
                  </span>
                </td>
              ))}
              <td className="py-1 pl-3 text-right tabular-nums font-semibold text-navy-950">
                {caller.total.toLocaleString("en-IN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
