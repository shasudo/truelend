import { appUrls, contactPhone } from "@truelend/reference";

// Approval state is owned by content/approval.ts.

export const site = {
  name: "TrueLend",
  tagline: "Lending Choices, Simplified.",
  slogan: "Before You Borrow. Think TrueLend.",
  url: appUrls.website,
  // Partner site landing page. Deep-linking to /dashboard bounces logged-out
  // visitors to sign-in; the landing page is the correct public entry point.
  partnerUrl: appUrls.partners,
  phone: contactPhone.display,
  phoneHref: contactPhone.href,
  whatsappHref: contactPhone.whatsappHref,
  email: "hello@truelend.in",
  address: "Hyderabad, Telangana, India",
  // ponytail: city-centre coordinates match the generic address. Replace them
  // when the content approval manifest names an approved office location;
  // the embedded map and directions link both derive from this single source.
  location: {
    latitude: 17.385044,
    longitude: 78.486671,
  },
  hours: "Mon–Sat · 9:30 AM – 6:30 PM IST",
  nav: [
    { label: "Products", href: "/products" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Referral Partner Network", href: appUrls.partners },
    { label: "Resources", href: "/blog" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  utilityStrip: [
    "Pan-India Lending Partners",
    "Experienced Borrowing Advisors",
    "Quick Response",
    "End-to-End Support",
  ],
  disclaimer:
    "TrueLend is a loan distribution platform. We help borrowers compare and choose credit products offered by our partner banks and NBFCs; loans are sanctioned and disbursed solely at the discretion of the respective lender. Interest rates, fees and eligibility norms shown are indicative and subject to change by the lender without notice.",
} as const;
