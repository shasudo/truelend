import Link from "next/link";
import { Button, Card, Input, cx } from "@truelend/ui";
import { rangePresetLabels, rangePresetValues, type DateRange } from "@/lib/date-range";

interface RangePickerProps {
  range: DateRange;
  /** The page this picker filters, e.g. "/" or "/crm/analytics". */
  basePath: string;
}

/*
 * Presets are plain links, not a form control: the URL is then the whole view
 * state, so a period is shareable, bookmarkable and back-button friendly — the
 * same rule the call queue's quick filters already follow. Only the custom range
 * needs a form, because only it takes typed input, and it uses native date
 * inputs because the platform already ships the picker, the locale-correct
 * display and the mobile keyboard for exactly this.
 */
export function RangePicker({ range, basePath }: RangePickerProps) {
  return (
    <Card className="mb-6 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap gap-2" aria-label="Reporting period">
          {rangePresetValues.map((preset) => {
            const active = range.key === preset;
            return (
              <Link
                key={preset}
                // "today" is the default, so it is the bare path — one canonical
                // URL for the default view rather than two that render the same.
                href={preset === "today" ? basePath : `${basePath}?range=${preset}`}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-hairline bg-white text-navy-700 hover:border-red-200 hover:text-red-600",
                )}
              >
                {rangePresetLabels[preset]}
              </Link>
            );
          })}
        </nav>
        <form method="get" action={basePath} className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            name="from"
            defaultValue={range.fromDay}
            aria-label="Period from"
            className="min-w-0"
          />
          <span className="shrink-0 text-sm text-muted">to</span>
          <Input
            type="date"
            name="to"
            defaultValue={range.toDay}
            aria-label="Period until"
            className="min-w-0"
          />
          <Button type="submit" size="sm" variant="secondary">
            Apply
          </Button>
        </form>
      </div>
    </Card>
  );
}
