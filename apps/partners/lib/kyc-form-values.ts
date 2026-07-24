export interface KycFormValues {
  pan: string | null;
  occupation: string | null;
  designation: string | null;
  experienceNote: string | null;
  address: string | null;
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  bankBranch: string | null;
  ifsc: string | null;
  nomineeName: string | null;
  nomineeAadhaar: string | null;
  nomineePhone: string | null;
}

/**
 * Builds the only partner fields that the editable KYC client form may receive.
 * Keeping this whitelist explicit prevents a full database row from silently
 * crossing the React Server Component boundary when the schema grows.
 */
export function toKycFormValues(source: KycFormValues): KycFormValues {
  return {
    pan: source.pan,
    occupation: source.occupation,
    designation: source.designation,
    experienceNote: source.experienceNote,
    address: source.address,
    bankName: source.bankName,
    accountHolder: source.accountHolder,
    accountNumber: source.accountNumber,
    bankBranch: source.bankBranch,
    ifsc: source.ifsc,
    nomineeName: source.nomineeName,
    nomineeAadhaar: source.nomineeAadhaar,
    nomineePhone: source.nomineePhone,
  };
}
