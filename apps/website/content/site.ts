// NOTE: phone / whatsapp / email / address are PLACEHOLDERS until TrueLend
// provides the real ones — tracked in todo.md.

export const site = {
  name: "TrueLend",
  tagline: "Lending Choices, Simplified.",
  slogan: "Before You Borrow. Think TrueLend.",
  url: "https://truelend.in",
  // Partner site landing page. Deep-linking to /dashboard bounces logged-out
  // visitors to sign-in; the landing page is the correct public entry point.
  partnerUrl: "https://partner.truelend.in",
  phone: "+91 98765 43210",
  phoneHref: "tel:+919876543210",
  whatsappHref: "https://wa.me/919876543210",
  email: "hello@truelend.in",
  address: "Hyderabad, Telangana, India",
  hours: "Mon–Sat · 9:30 AM – 6:30 PM IST",
  nav: [
    { label: "Products", href: "/products" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Partner Network", href: "https://partner.truelend.in" },
    { label: "Resources", href: "/blog" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  utilityStrip: [
    "Pan India Presence",
    "Quick Response",
    "Expert Consultation",
    "Hassle-free Process",
  ],
  disclaimer:
    "TrueLend is a loan distribution platform. We help borrowers compare and choose credit products offered by our partner banks and NBFCs; loans are sanctioned and disbursed solely at the discretion of the respective lender. Interest rates, fees and eligibility norms shown are indicative and subject to change by the lender without notice.",
} as const;
