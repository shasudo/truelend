import { partnerDocumentTypeValues } from "@truelend/reference";
import type { FakeRow } from "./fake-drizzle";

/** A partner row with every field evaluatePartnerApplication/isKycEditable checks filled in. */
export function buildPartnerRow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    userId: "user-1",
    status: "pending",
    referenceId: "RP1",
    phone: "9876543210",
    dateOfBirth: "1990-01-01",
    city: "Mumbai",
    referralType: "self",
    pan: "ABCDE1234F",
    occupation: "Sales",
    designation: "Manager",
    experienceNote: "",
    address: "123 Example Street, Example City",
    bankName: "Example Bank",
    accountHolder: "Test Partner",
    accountNumber: "123456789012",
    bankBranch: "Main Branch",
    ifsc: "HDFC0001234",
    nomineeName: "Nominee Name",
    nomineeAadhaar: null,
    nomineePhone: "9876543211",
    submittedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    ...overrides,
  };
}

export const ALL_PARTNER_DOC_TYPES = new Set<string>(partnerDocumentTypeValues);
