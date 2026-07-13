/*
 * Money + date display helpers, shared by admin and partners. Money is integer
 * paise everywhere in the DB; convert rupees↔paise only at the form boundary
 * and format with Intl en-IN. Never floats.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Integer paise → "₹1,25,000". Whole rupees (paise dropped in display). */
export function formatPaise(paise: number | null | undefined): string {
  if (paise == null) return "—";
  return inr.format(Math.round(paise / 100));
}

/** Rupees string from a form → integer paise, or null if blank. */
export function rupeesToPaise(input: string | null | undefined): number | null {
  if (input == null) return null;
  const trimmed = String(input)
    .replace(/[,\s₹]/g, "")
    .trim();
  if (trimmed === "") return null;
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees) || rupees < 0) return null;
  return Math.round(rupees * 100);
}

/** Integer paise → a plain rupees string for a number input default ("" if null). */
export function paiseToRupeesInput(paise: number | null | undefined): string {
  return paise == null ? "" : String(paise / 100);
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const formatDate = (d: Date) => dateFmt.format(d);
export const formatDateTime = (d: Date) => dateTimeFmt.format(d);
