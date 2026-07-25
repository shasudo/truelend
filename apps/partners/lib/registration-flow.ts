export type RegistrationErrorCode =
  | "invalid_input"
  | "rate_limited"
  | "verification_failed"
  | "registration_failed"
  | "service_unavailable"
  | "account_conflict";

export type RegistrationStep = 1 | 2 | 3;
export type RegistrationAccountDecision = "create" | "existing" | "ineligible";

const contactFields = new Set(["email", "password", "phone"]);
const registrationValueLimits = {
  name: 120,
  dateOfBirth: 10,
  referralType: 80,
  city: 100,
  pan: 10,
  experienceNote: 80,
  email: 254,
  phone: 20,
} as const;

export type RegistrationFormValues = Partial<Record<keyof typeof registrationValueLimits, string>>;

export function registrationStepForIssue(path: readonly PropertyKey[]): RegistrationStep {
  const field = path[0];
  if (field === "turnstileToken") return 3;
  if (typeof field === "string" && contactFields.has(field)) return 2;
  return 1;
}

export function registrationAccountDecision(
  role: string | null | undefined,
  hasPartnerProfile: boolean,
): RegistrationAccountDecision {
  if (role === "referral" && hasPartnerProfile) return "existing";
  if (role === null && !hasPartnerProfile) return "create";
  return "ineligible";
}

export function registrationValuesFromSubmission(
  submission: Record<string, unknown>,
  includeEmail: boolean,
): RegistrationFormValues {
  const values: RegistrationFormValues = {};
  for (const [field, limit] of Object.entries(registrationValueLimits)) {
    if (field === "email" && !includeEmail) continue;
    const value = submission[field];
    if (typeof value === "string") {
      values[field as keyof RegistrationFormValues] = value.slice(0, limit);
    }
  }
  return values;
}

export function registrationErrorNeedsNewVerification(
  code: RegistrationErrorCode | undefined,
): boolean {
  return (
    code === "verification_failed" ||
    code === "registration_failed" ||
    code === "service_unavailable"
  );
}

export function registrationErrorOffersAccountHelp(
  code: RegistrationErrorCode | undefined,
): boolean {
  return code === "registration_failed";
}
