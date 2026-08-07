/*
 * The reporting window every activity number on the overview is measured over.
 *
 * Pure, and deliberately outside the *-queries modules (so out of `server-only`)
 * for the same reason query-filters.ts is: the boundaries are the part that can
 * be silently wrong — an off-by-one day here misstates a whole day's numbers on
 * a page people make decisions from — and asserting them needs a plain import.
 *
 * Everything is IST. A Worker runs in UTC, so "today" resolved naively is wrong
 * for the first 5.5 hours of every Indian day; the same trap query-filters.ts
 * and crm-actions.ts already pin the offset for. India has no DST, so a flat
 * 24h step reaches the next day's boundary exactly.
 */

export const rangePresetValues = ["today", "yesterday", "7d", "30d", "all"] as const;
export type RangePreset = (typeof rangePresetValues)[number];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const IST_DAY_MS = 24 * 60 * 60 * 1000;

export interface DateRange {
  /** The preset chosen, or "custom" when explicit dates were supplied. */
  key: RangePreset | "custom";
  label: string;
  /** Inclusive lower bound. Epoch for "all time", so no query needs a conditional clause. */
  from: Date;
  /** Exclusive upper bound — the start of the day after the last day in range. */
  to: Date;
  /** The YYYY-MM-DD values to render back into the custom date inputs. */
  fromDay: string;
  toDay: string;
}

/** The IST calendar day an instant falls on, as YYYY-MM-DD. */
function istDay(instant: Date): string {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight IST at the start of a bare YYYY-MM-DD, or null if it isn't one. */
function istDayStart(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T00:00:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Every IST calendar day in [from, to), ascending, capped to the most recent
 * `maxDays`. This is the axis a per-day view is drawn against, built here rather
 * than from the rows returned so a day nobody worked still gets a column —
 * "which days did this caller not dial at all" is the whole point of looking.
 *
 * The cap matters because "All time" starts at the epoch: without it the axis
 * would be twenty thousand columns wide.
 */
export function istDaysBetween(from: Date, to: Date, maxDays = 30): string[] {
  const lastStart = new Date(to.getTime() - IST_DAY_MS);
  const days: string[] = [];
  for (let day = new Date(lastStart); day >= from && days.length < maxDays;) {
    days.push(istDay(day));
    day = new Date(day.getTime() - IST_DAY_MS);
  }
  return days.reverse();
}

export const rangePresetLabels: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

export interface RangeInput {
  range?: string;
  from?: string;
  to?: string;
}

/**
 * Explicit dates win over the preset, so a bookmarked custom range survives a
 * stale `range` param riding along in the URL. A half-filled custom range (one
 * date only) is completed from the other end rather than rejected — a user who
 * typed one date meant something by it.
 *
 * `now` is injected so the windows are assertable; a range built from a moving
 * `new Date()` cannot be compared in a test.
 */
export function resolveRange(input: RangeInput, now: Date = new Date()): DateRange {
  const todayStart = istDayStart(istDay(now));
  // istDay always yields a well-formed day, so this cannot be null; the fallback
  // exists only to keep the type honest without a non-null assertion.
  const today = todayStart ?? new Date(now.getTime() - (now.getTime() % IST_DAY_MS));
  const tomorrow = new Date(today.getTime() + IST_DAY_MS);

  const customFrom = input.from ? istDayStart(input.from) : null;
  const customTo = input.to ? istDayStart(input.to) : null;
  if (customFrom || customTo) {
    const from = customFrom ?? customTo ?? today;
    const lastDay = customTo ?? customFrom ?? today;
    // Inverted ranges (from after to) would otherwise silently return nothing.
    const start = from <= lastDay ? from : lastDay;
    const end = from <= lastDay ? lastDay : from;
    return {
      key: "custom",
      label: `${istDay(start)} to ${istDay(end)}`,
      from: start,
      to: new Date(end.getTime() + IST_DAY_MS),
      fromDay: istDay(start),
      toDay: istDay(end),
    };
  }

  const preset: RangePreset = rangePresetValues.includes(input.range as RangePreset)
    ? (input.range as RangePreset)
    : "today";

  // Rolling windows are counted in whole IST days ending with today, not in
  // rolling 24h blocks: "last 7 days" on a report means seven calendar days.
  const spans: Record<RangePreset, { from: Date; to: Date }> = {
    today: { from: today, to: tomorrow },
    yesterday: { from: new Date(today.getTime() - IST_DAY_MS), to: today },
    "7d": { from: new Date(today.getTime() - 6 * IST_DAY_MS), to: tomorrow },
    "30d": { from: new Date(today.getTime() - 29 * IST_DAY_MS), to: tomorrow },
    all: { from: new Date(0), to: tomorrow },
  };
  const span = spans[preset];
  return {
    key: preset,
    label: rangePresetLabels[preset],
    from: span.from,
    to: span.to,
    fromDay: istDay(span.from),
    // The inputs show the last day IN the range, not the exclusive bound.
    toDay: istDay(new Date(span.to.getTime() - IST_DAY_MS)),
  };
}
