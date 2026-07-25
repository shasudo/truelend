import type { Metadata } from "next";
import { Container } from "@truelend/ui";
import { appUrls } from "@truelend/reference";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

const sections = [
  {
    heading: "1. Definitions",
    paragraphs: [
      "“Applicable Law” means all applicable statutes, rules, regulations and directions of India, including the DPDP Act, 2023, the Information Technology Act, 2000, the Credit Information Companies (Regulation) Act, 2005, and directions issued by the Reserve Bank of India (“RBI”) from time to time, including the RBI Digital Lending Guidelines.",
      "“Data Fiduciary” means TrueLend, which determines the purpose and means of processing personal data under this Policy.",
      "“Data Principal” means the individual to whom the personal data relates, referred to as “you” in this Policy.",
      "“Partner Lender” means a bank, NBFC, housing finance company or other lawfully operating financial institution with which TrueLend has an arrangement to refer or route enquiries.",
      "“Personal Data” means any data about an individual who is identifiable by or in relation to such data, as defined under the DPDP Act.",
      "“Referral Partner” means an independent third party registered with TrueLend under its Referral Partner Network to refer prospective Users to the Platform.",
    ],
  },
  {
    heading: "2. Personal Information We Collect",
    introduction:
      "We may collect the following categories of personal data that you voluntarily provide, or that a Borrowing Advisor records on your behalf, in connection with your enquiry:",
    bullets: [
      "Your name, mobile number, email address, residential address and date of birth.",
      "Your PAN, and Aadhaar details only where you choose to share them and only to the extent required for a specific feature such as credit score access, handled in masked form wherever feasible.",
      "Your employment and financial details, including employer or business information, income, existing loans, and credit card and EMI obligations.",
      "Your credit information, including credit score and credit report data obtained from Credit Information Companies with your consent.",
      "Identity verification documents that you share for onward transmission to a Partner Lender for its independent KYC process.",
      "Records of your communication with our Borrowing Advisors, including call recordings, WhatsApp messages, emails and chat transcripts, where legally permitted and disclosed to you.",
      "Device identifiers, applicable once a TrueLend mobile application is introduced.",
    ],
  },
  {
    heading: "3. Non-Personal and Technical Information We Collect",
    introduction:
      "We may automatically collect the following technical information when you use the Platform:",
    bullets: [
      "Browser type, device type and operating system.",
      "IP address and approximate location derived from it (not precise GPS location, unless separately permitted by you through a future mobile application).",
      "Pages viewed, time spent, click-stream and session data.",
      "Aggregated analytics data used to understand Platform usage and performance.",
    ],
  },
  {
    heading: "4. Cookies and Similar Technologies",
    paragraphs: [
      "4.1 Use of Cookies. We use cookies and similar technologies to operate the Platform, remember your preferences, and understand how the Platform is used.",
      "4.2 Analytics. We may use third-party analytics tools to collect aggregated, non-identifiable usage statistics for improving the Platform.",
      "4.3 Future Mobile Application. Where a TrueLend mobile application is introduced, equivalent technologies such as software development kits (SDKs) may be used for analytics, crash reporting and notifications, and shall be described in an updated version of this Policy.",
      "4.4 Managing Cookies. You may control or disable cookies through your browser settings. Disabling cookies may affect certain features of the Platform.",
      "4.5 No Automated Credit Decisions. Cookies and analytics data are used for Platform functioning and improvement only, and are not used by TrueLend to make any credit or lending decision.",
    ],
  },
  {
    heading: "5. Purpose of Collection and Use",
    introduction: "We collect and use your personal data for the following purposes:",
    bullets: [
      "To create and manage your enquiry or account, and to respond to your requests.",
      "To assess your borrowing profile and identify potentially suitable Partner Lenders, through our internal Borrowing Intelligence Framework.",
      "To assist with preliminary identity and eligibility checks; complete KYC/CDD remains the responsibility of the relevant Partner Lender.",
      "To provide customer support through our Borrowing Advisors.",
      "To detect, prevent and investigate fraud, security incidents or misuse of the Platform.",
      "To comply with our obligations under Applicable Law, including RBI, tax and record-keeping requirements.",
      "To carry out internal analytics, research and Platform improvement.",
      "To send you promotional or marketing communications, where you have consented to receive them, and which you may opt out of at any time.",
      "To personalise the loan and credit product options shown or recommended to you.",
    ],
  },
  {
    heading: "6. Sharing and Disclosure of Information",
    paragraphs: [
      "6.1 Partner Lenders. With your consent, we share relevant personal and financial information with Partner Lenders (banks, NBFCs and other lending institutions) solely to enable them to assess and process your enquiry.",
      "6.2 Referral Partners. Where your enquiry originates through a Referral Partner, we may share limited information with that Referral Partner to confirm origination of the enquiry, but not your full financial profile.",
      "6.3 Service Providers. We engage third-party service providers for hosting, cloud storage, analytics, communication (SMS, email, WhatsApp) and related functions, who are permitted to process personal data only for the purpose for which it is shared and are bound by confidentiality obligations.",
      "6.4 Credit Information Companies. Where you use a credit score or credit report feature, we share necessary information with Credit Information Companies registered under the Credit Information Companies (Regulation) Act, 2005, with your consent.",
      "6.5 Regulators and Law Enforcement. We may disclose personal data to courts, regulators (including the RBI and the Data Protection Board of India), government authorities or law enforcement agencies where required under Applicable Law or in response to lawful process.",
      "6.6 Business Transfers. In the event of a merger, acquisition, restructuring or sale of business, personal data may be transferred to the successor entity, which shall remain bound by this Policy or a materially equivalent policy.",
      "6.7 No Sale of Data. TrueLend does not sell your personal data to third parties for monetary consideration.",
      "6.8 Cross-Border Processing. Your personal data is primarily stored and processed in India. Where a service provider processes data outside India, we shall ensure this occurs only in a manner permitted under the DPDP Act and subject to appropriate contractual safeguards.",
    ],
  },
  {
    heading: "7. Data Security, Storage and Retention",
    paragraphs: [
      "7.1 Safeguards. We implement reasonable administrative, technical and organisational safeguards, including access controls, encryption in transit, and need-to-know access restrictions, to protect personal data against unauthorised access, loss or misuse.",
      "7.2 Storage. Personal data is stored on secure infrastructure provided by [---] or such other hosting arrangement as TrueLend may adopt from time to time.",
      "7.3 Retention. We retain personal data only for as long as necessary to fulfil the purposes described in this Policy, or as required under Applicable Law (including RBI record-retention norms), not exceeding [Retention Period], after which it is securely deleted or anonymised.",
      "7.4 Breach Notification. In the event of a personal data breach, TrueLend shall notify the Data Protection Board of India and affected Data Principals in accordance with the DPDP Act, and shall comply with applicable CERT-In incident reporting timelines.",
      "7.5 No Absolute Security. No method of transmission or storage over the internet is completely secure. While we take reasonable measures to protect your data, we cannot guarantee absolute security.",
    ],
  },
  {
    heading: "8. Your Privacy Rights",
    introduction:
      "As a Data Principal under the DPDP Act, you have the following rights in respect of your personal data, which you may exercise by contacting us as set out in Clause 11:",
    paragraphs: [
      "8.1 Right to Access. To obtain a summary of the personal data we hold about you and the processing activities undertaken.",
      "8.2 Right to Correction and Updating. To request correction of inaccurate or incomplete personal data.",
      "8.3 Right to Erasure. To request deletion of personal data that is no longer necessary for the purpose it was collected, subject to any retention obligation under Applicable Law.",
      "8.4 Right to Withdraw Consent. To withdraw consent at any time, with such withdrawal being as easy as giving consent. Withdrawal may limit or prevent our ability to continue providing certain Services to you.",
      "8.5 Right to Grievance Redressal. To raise a grievance regarding the processing of your personal data through the mechanism described in Clause 11.",
      "8.6 Right to Nominate. To nominate another individual to exercise these rights on your behalf in the event of your death or incapacity, in the manner prescribed under the DPDP Act.",
    ],
  },
  {
    heading: "9. Compliance with Applicable Laws",
    paragraphs: [
      "9.1 Statutory Framework. TrueLend processes personal data in accordance with the DPDP Act, 2023, the Information Technology Act, 2000 (including rules made thereunder), and, to the extent applicable to TrueLend’s role as a facilitator, the RBI Digital Lending Guidelines and RBI Outsourcing Guidelines.",
      "9.2 Data Minimisation. In line with the RBI Digital Lending Guidelines, TrueLend collects only such data as is necessary for the purpose disclosed to you, and does not store certain sensitive payment credentials on its own systems.",
      "9.3 Law Enforcement Cooperation. We cooperate with law enforcement agencies, regulators and courts in accordance with Applicable Law, including in connection with fraud investigations.",
      "9.4 Your Obligations. You agree to provide accurate personal data and not to impersonate any person while using the Platform, in accordance with your obligations as a Data Principal under the DPDP Act.",
    ],
  },
  {
    heading: "10. Changes to This Privacy Policy",
    paragraphs: [
      "10.1 Right to Amend. TrueLend may update this Policy from time to time to reflect changes in law, regulatory guidance or our data practices.",
      "10.2 Notification. Updates shall be posted on the Platform with a revised “Effective Date”. Material changes may additionally be notified through the Platform, email or SMS, where feasible.",
      "10.3 Continued Use. Continued use of the Platform after an updated Policy is posted constitutes acceptance of the revised Policy.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        lede="How TrueLend collects, uses, discloses, stores and protects personal data."
      />
      <Container className="max-w-3xl py-16 text-navy-700">
        <article className="space-y-10 leading-relaxed">
          <div className="space-y-4">
            <p>
              This Privacy Policy describes how [---] (“TrueLend”, “we”, “us” or “our”), acting as a
              Data Fiduciary under the Digital Personal Data Protection Act, 2023 (“DPDP Act”),
              collects, uses, discloses, stores and protects the personal data of individuals (“you”
              or “Data Principal”) who access or use the TrueLend platform at{" "}
              <a href={appUrls.website} className="underline underline-offset-2">
                {appUrls.website}
              </a>
              , any future mobile application, or who interact with us by telephone, WhatsApp,
              email, or through a Borrowing Advisor, including where an enquiry originates through
              TrueLend’s Referral Partner Network (together, the “Platform”).
            </p>
            <p>
              TrueLend is committed to handling personal data responsibly and transparently, in
              accordance with the DPDP Act, the Information Technology Act, 2000, and other
              Applicable Law. This Policy should be read together with our Terms of Use. By
              accessing the Platform, submitting an enquiry, or otherwise providing personal data to
              TrueLend, you consent to the collection, use and disclosure of such data as described
              below.
            </p>
          </div>
          {sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="font-display text-xl font-bold text-navy-950">{section.heading}</h2>
              {"introduction" in section && <p>{section.introduction}</p>}
              {"bullets" in section && (
                <ul className="list-disc space-y-2 pl-6">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
              {"paragraphs" in section &&
                section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
          <p>
            Grievances relating to the processing of your personal data will be acknowledged within
            48 hours and addressed within 30 days, in accordance with Applicable Law.
          </p>
        </article>
        <p className="mt-10 border-t border-hairline pt-6 text-sm text-muted">
          Last updated: 25 July 2026.
        </p>
      </Container>
    </>
  );
}
