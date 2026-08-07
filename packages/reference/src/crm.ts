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
  // `attempted` is the original no-answer outcome and is spelled that way in
  // every row already written; it is labelled "No answer" rather than renamed so
  // the outcome list reads the way callers describe it without a data migration.
  "attempted",
  "busy",
  "callback_scheduled",
  // Three interest outcomes, one per product the caller can be sold. `interested`
  // predates the split and keeps meaning the loan one — same reason as above.
  "interested",
  "interested_card",
  "interested_both",
  "not_interested",
  "already_has_product",
  "wrong_number",
  "do_not_contact",
] as const;
export type EmployeeCallStatus = (typeof employeeCallStatusValues)[number];

/*
 * `converted` is written only by the conversion action; `exhausted` only by the
 * attempt cap in updateCallTaskStatusAction. Neither is settable from the
 * dropdown, which is the point of keeping the employee list separate.
 */
export const callStatusValues = [...employeeCallStatusValues, "converted", "exhausted"] as const;
export type CallStatus = (typeof callStatusValues)[number];

export const callStatusLabels: Readonly<Record<string, string>> = {
  new: "New",
  attempted: "No answer",
  busy: "Busy",
  callback_scheduled: "Callback scheduled",
  interested: "Interested – Loan",
  interested_card: "Interested – Credit Card",
  interested_both: "Interested – Both",
  not_interested: "Not interested",
  already_has_product: "Already has product",
  wrong_number: "Wrong number",
  do_not_contact: "Do not contact",
  converted: "Converted",
  exhausted: "Max attempts reached",
} satisfies Record<CallStatus, string>;

/*
 * Any interest outcome. Grouped rather than compared to a single value because
 * three of them now mean "this prospect is worth converting", and every count,
 * filter and badge that used to test `= 'interested'` has to mean all three.
 */
export const interestedCallStatusValues = [
  "interested",
  "interested_card",
  "interested_both",
] as const;
const interestedCallStatuses = new Set<string>(interestedCallStatusValues);

export function isInterestedCallStatus(status: string): boolean {
  return interestedCallStatuses.has(status);
}

// A terminal task is done: no further outcome, and the convert action refuses it.
export const terminalCallStatusValues = [
  "not_interested",
  "already_has_product",
  "wrong_number",
  // ponytail: suppression is per-task, so a re-import of the same number opens a
  // fresh task that nobody has flagged yet. Add a phone-level suppression list if
  // a DNC number ever comes back through an import.
  "do_not_contact",
  "converted",
  "exhausted",
] as const;
const terminalCallStatuses = new Set<string>(terminalCallStatusValues);

export function isTerminalCallStatus(status: string): boolean {
  return terminalCallStatuses.has(status);
}

/*
 * How many times a number may be dialled without ever reaching the person before
 * the queue gives up on it. Only the outcomes below count: a conversation that
 * ended in "call me Tuesday" is contact, not a failed attempt, so it does not
 * burn the budget. The cap-th failed attempt closes the task as `exhausted`.
 */
export const MAX_CALL_ATTEMPTS = 6;

const unansweredCallStatuses = new Set<string>(["attempted", "busy"]);

export function isUnansweredCallStatus(status: string): boolean {
  return unansweredCallStatuses.has(status);
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
