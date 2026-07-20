export interface KycFormValues {
  type: "business" | "referral";
  pan: string | null;
  gst: string | null;
  alternatePhone: string | null;
  productsHandled: string[] | null;
  yearsExperience: number | null;
  monthlyVolumeLoansPaise: number | null;
  monthlyVolumeInsurancePaise: number | null;
  monthlyVolumeMutualFundsPaise: number | null;
  occupation: string | null;
  designation: string | null;
  experienceNote: string | null;
  address: string | null;
  residenceAddress: string | null;
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
    type: source.type,
    pan: source.pan,
    gst: source.gst,
    alternatePhone: source.alternatePhone,
    productsHandled: source.productsHandled,
    yearsExperience: source.yearsExperience,
    monthlyVolumeLoansPaise: source.monthlyVolumeLoansPaise,
    monthlyVolumeInsurancePaise: source.monthlyVolumeInsurancePaise,
    monthlyVolumeMutualFundsPaise: source.monthlyVolumeMutualFundsPaise,
    occupation: source.occupation,
    designation: source.designation,
    experienceNote: source.experienceNote,
    address: source.address,
    residenceAddress: source.residenceAddress,
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
