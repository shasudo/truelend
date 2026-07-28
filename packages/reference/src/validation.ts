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

export function normalizeIndianMobile(value: string): string {
  return value.trim().replace(/[\s-]/g, "");
}
