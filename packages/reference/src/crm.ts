/*
 * Outbound call queue. Rows arrive by admin CSV import, get assigned to a
 * caller, and either die on a terminal outcome or convert into a lead.
 */

/*
 * Statuses a caller may set. `converted` is deliberately absent: only the
 * conversion action writes it, and only once a lead row exists. Keeping the
 * employee list separate from the enum means a status can never be settable
 * from a dropdown without also existing in the database.
 */
export const employeeCallStatusValues = [
  "new",
  "attempted",
  "callback_scheduled",
  "interested",
  "not_interested",
  "wrong_number",
] as const;
export type EmployeeCallStatus = (typeof employeeCallStatusValues)[number];

export const callStatusValues = [...employeeCallStatusValues, "converted"] as const;
export type CallStatus = (typeof callStatusValues)[number];

export const callStatusLabels: Readonly<Record<string, string>> = {
  new: "New",
  attempted: "Attempted",
  callback_scheduled: "Callback scheduled",
  interested: "Interested",
  not_interested: "Not interested",
  wrong_number: "Wrong number",
  converted: "Converted",
} satisfies Record<CallStatus, string>;

// A terminal task is done: no further outcome, and the convert action refuses it.
export const terminalCallStatusValues = ["not_interested", "wrong_number", "converted"] as const;
const terminalCallStatuses = new Set<string>(terminalCallStatusValues);

export function isTerminalCallStatus(status: string): boolean {
  return terminalCallStatuses.has(status);
}

/*
 * CSV header aliases. Operators export from Excel or Sheets and rename columns,
 * so accept the handful of spellings a real call list actually arrives with
 * rather than forcing them to rewrite the header row. Matching is
 * case-insensitive and whitespace-trimmed at the boundary.
 */
export const callTaskCsvColumns = {
  name: ["name", "full name", "customer name", "contact name"],
  // Deliberately excludes the bare word "contact": it's as likely to mean a
  // point-of-contact name as a phone number, and claiming it here would let it
  // silently swallow a real name column or, worse, route non-phone text into
  // the phone field on every row.
  phone: ["phone", "mobile", "phone number", "mobile number"],
  email: ["email", "email id", "email address"],
  city: ["city", "location"],
  product: ["product", "product slug", "loan type"],
  source: ["source", "campaign", "list"],
  // Optional free-text the caller sees before dialling. Both spellings of
  // remark(s) matter: a header of "remark" would otherwise import as nothing.
  notes: ["remark", "remarks", "notes", "note", "comments", "comment"],
} as const;

export type CallTaskCsvColumn = keyof typeof callTaskCsvColumns;

export const callTaskCsvRequiredColumns = [
  "name",
  "phone",
] as const satisfies readonly CallTaskCsvColumn[];
