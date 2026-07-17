export interface PartnerPath {
  type: "business" | "referral";
  title: string;
  question: string;
  promise: string;
  who: string;
  examples: string[];
  does: string[];
  receives: string[];
}

export const partnerPaths: PartnerPath[] = [
  {
    type: "business",
    title: "TrueLend Business Partner",
    question: "Already in loan sales?",
    promise: "Bring business. Earn commissions.",
    who: "Experienced professionals who already generate or source loan business.",
    examples: [
      "Existing Loan DSAs",
      "Independent Loan Consultants",
      "Financial Advisors",
      "Real Estate Professionals",
      "Chartered Accountants",
      "Builders & Developers",
    ],
    does: [
      "Source customers",
      "Submit complete loan cases",
      "Coordinate documentation",
      "Work with the TrueLend Partner Support Team",
    ],
    receives: [
      "Business commissions",
      "Dedicated relationship manager",
      "Lead tracking",
      "Marketing resources",
      "Training",
      "Faster support",
    ],
  },
  {
    type: "referral",
    title: "TrueLend Referral Partner",
    question: "No loan experience?",
    promise: "Simply refer people. Earn referral rewards.",
    who: "People with a trusted personal or professional network but no lending experience.",
    examples: [
      "Salaried Employees",
      "Government Employees",
      "Teachers",
      "Doctors",
      "Students",
      "Homemakers",
      "Entrepreneurs",
      "Existing Customers",
    ],
    does: ["Simply introduce someone who needs a loan", "TrueLend handles everything else"],
    receives: [
      "Referral rewards",
      "End-to-end support",
      "No documentation expertise required",
      "No sales targets",
      "No investment",
    ],
  },
];
