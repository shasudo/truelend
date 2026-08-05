/*
 * A small RFC4180 reader. Operators export call lists from Excel or Google
 * Sheets, so quoted fields, "" escapes, embedded commas and newlines, CRLF and
 * a leading BOM all arrive in practice — a split on /[,\n]/ mangles every one
 * of them. No dependency for a character scanner.
 */
export class UnbalancedQuoteError extends Error {
  constructor() {
    super("unbalanced_quote");
    this.name = "UnbalancedQuoteError";
  }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  // Excel writes a UTF-8 BOM; left in place it becomes part of the first header
  // name and the column never resolves.
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  for (; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char !== '"') {
        field += char;
      } else if (text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = false;
      }
      continue;
    }

    // Only a quote at the start of a field opens a quoted section. A stray
    // quote mid-value (`Flat 3" wide`) is literal — treating it as an opener
    // would swallow the rest of the file into one field.
    if (char === '"' && field === "") {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      endField();
      continue;
    }
    if (char === "\r") {
      if (text[i + 1] === "\n") i += 1;
      endRow();
      continue;
    }
    if (char === "\n") {
      endRow();
      continue;
    }
    field += char;
  }

  /*
   * A quote that never closes swallows every following line into one field, so
   * the file would import with rows silently merged and prospects missing.
   * Refuse it rather than guess where the record was meant to end.
   */
  if (inQuotes) throw new UnbalancedQuoteError();

  // A file that does not end in a newline still has a final row; one that does
  // must not gain a trailing empty one.
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/**
 * Resolves a header row to column indexes using the given alias table.
 * Matching is case-insensitive and trimmed; the first alias to match a
 * column wins, so a sheet with both "phone" and "mobile" keeps the leftmost.
 */
export function mapHeader<Column extends string>(
  header: readonly string[],
  columnAliases: Record<Column, readonly string[]>,
): Partial<Record<Column, number>> {
  const columns: Partial<Record<Column, number>> = {};
  header.forEach((raw, index) => {
    const cell = raw.trim().toLowerCase();
    if (cell === "") return;
    for (const [column, aliases] of Object.entries(columnAliases)) {
      const key = column as Column;
      if (columns[key] === undefined && (aliases as readonly string[]).includes(cell)) {
        columns[key] = index;
        return;
      }
    }
  });
  return columns;
}
