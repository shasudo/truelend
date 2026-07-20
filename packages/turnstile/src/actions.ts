export const turnstileActions = [
  "lead_enquiry",
  "lead_referral",
  "lead_contact",
  "lead_cibil_notify",
  "partner_registration",
] as const;

export type TurnstileAction = (typeof turnstileActions)[number];
