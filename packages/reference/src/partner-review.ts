import type { PartnerStatus } from "./partners";

export type PartnerReviewStatus = PartnerStatus;

export const partnerDocTypes = [
  { type: "pan", label: "PAN Card" },
  { type: "aadhaar", label: "Aadhaar Card" },
  { type: "photo", label: "Passport-size Photo" },
  { type: "cheque", label: "Cancelled Cheque" },
] as const;

export type PartnerDocumentType = (typeof partnerDocTypes)[number]["type"];

export const partnerDocumentTypeValues = partnerDocTypes.map((document) => document.type) as [
  PartnerDocumentType,
  ...PartnerDocumentType[],
];

export const partnerDocTypeLabels: Readonly<Record<PartnerDocumentType, string>> =
  Object.fromEntries(partnerDocTypes.map((document) => [document.type, document.label])) as Record<
    PartnerDocumentType,
    string
  >;

/**
 * The structural data needed to decide whether a partner application is
 * complete. Keeping this independent of the database package lets every app
 * enforce the same policy without coupling this reference package to Drizzle.
 */
export interface PartnerApplicationData {
  pan: string | null;
  address: string | null;
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  bankBranch: string | null;
  ifsc: string | null;
  nomineeName: string | null;
  nomineePhone: string | null;
  occupation: string | null;
  designation: string | null;
}

export interface PartnerReviewState {
  status: PartnerReviewStatus;
  submittedAt: Date | null;
}

export type PartnerApplicationField = keyof PartnerApplicationData;

export interface PartnerApplicationEvaluation {
  missingFields: PartnerApplicationField[];
  missingDocumentTypes: PartnerDocumentType[];
  isComplete: boolean;
  isKycEditable: boolean;
  canSubmit: boolean;
  canApprove: boolean;
}

const commonRequiredFields = [
  "pan",
  "address",
  "bankName",
  "accountHolder",
  "accountNumber",
  "bankBranch",
  "ifsc",
  "nomineeName",
  "nomineePhone",
] as const satisfies readonly PartnerApplicationField[];

const referralRequiredFields = [
  "occupation",
  "designation",
] as const satisfies readonly PartnerApplicationField[];

const requiredDocumentTypes = partnerDocTypes.map((document) => document.type);

function hasValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value != null;
}

function applicationCompletion(
  partner: PartnerApplicationData,
  uploadedDocumentTypes: ReadonlySet<string>,
) {
  const requiredFields: readonly PartnerApplicationField[] = [
    ...commonRequiredFields,
    ...referralRequiredFields,
  ];
  const missingFields = requiredFields.filter((field) => !hasValue(partner[field]));
  const missingDocumentTypes = requiredDocumentTypes.filter(
    (documentType) => !uploadedDocumentTypes.has(documentType),
  );

  return {
    missingFields,
    missingDocumentTypes,
    isComplete: missingFields.length === 0 && missingDocumentTypes.length === 0,
  };
}

/** Whether KYC details and documents may be changed without bypassing review. */
export function isKycEditable(partner: PartnerReviewState): boolean {
  if (partner.status === "verified") return false;
  return partner.status !== "pending" || partner.submittedAt == null;
}

/**
 * Evaluates the complete partner-side submission and admin-side approval
 * policy. Callers still need to lock and re-read the relevant database rows
 * before acting; this function only decides the state transition.
 */
export function evaluatePartnerApplication(
  partner: PartnerApplicationData & PartnerReviewState,
  uploadedDocumentTypes: ReadonlySet<string>,
): PartnerApplicationEvaluation {
  const completion = applicationCompletion(partner, uploadedDocumentTypes);
  const editable = isKycEditable(partner);
  const awaitingReview = partner.status === "pending" && partner.submittedAt != null;

  return {
    ...completion,
    isKycEditable: editable,
    canSubmit: editable && completion.isComplete,
    canApprove: awaitingReview && completion.isComplete,
  };
}

/** Evaluates completeness when transition permissions are not needed. */
export function isApplicationComplete(
  partner: PartnerApplicationData,
  uploadedDocumentTypes: ReadonlySet<string>,
): boolean {
  return applicationCompletion(partner, uploadedDocumentTypes).isComplete;
}
