/**
 * Parses a bank CSV date cell (e.g. "2026-06-09 00:00:00") down to its date
 * part, rejecting anything that isn't a real calendar date. A shape match
 * alone (`^\d{4}-\d{2}-\d{2}`) is not enough — Postgres rejects an
 * out-of-range date like "2026-13-45" at the database level, and since every
 * matched row in an import updates inside one transaction, a single bad cell
 * would otherwise roll back every other row's legitimate status update too.
 */
export function parseBankDate(cell: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(cell.trim());
  if (!match) return null;
  const [iso, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  // Date.UTC silently normalizes an out-of-range component (day 31 in a
  // 28-day month rolls into the next month) instead of throwing, so the
  // round-trip is what actually catches an impossible date.
  const date = new Date(Date.UTC(year, month - 1, day));
  const roundTrips =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return roundTrips ? iso : null;
}
