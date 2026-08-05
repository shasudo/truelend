export const validationPatterns = {
  indianMobile: /^[6-9]\d{9}$/,
  pincode: /^\d{6}$/,
  rupeeAmount: /^\d{1,10}$/,
  smallInteger: /^\d{1,3}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
} as const;

export const validationMessages = {
  indianMobile: "Enter a valid 10-digit mobile number",
  pincode: "Enter a 6-digit PIN code",
  rupeeAmount: "Enter the amount in rupees (digits only)",
  smallInteger: "Numbers only",
  pan: "Enter a valid PAN (e.g. ABCDE1234F)",
} as const;

/*
 * Real call lists and copy-pasted contacts carry a `+91`/`91` country code or a
 * leading trunk `0` far more often than not. Strip those down to the bare
 * 10-digit number so the indianMobile pattern (which never allows them) still
 * matches — otherwise the single most common real-world format fails
 * validation outright.
 */
export function normalizeIndianMobile(value: string): string {
  const digits = value.trim().replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}
