import type { Metadata } from "next";
import { Container } from "@truelend/ui";
import { appUrls } from "@truelend/reference";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Terms of Use",
  alternates: { canonical: "/terms" },
};

const terms = [
  {
    heading: "1. Definitions",
    paragraphs: [
      "“Applicable Law” means, unless the context otherwise requires, all applicable statutes, regulations, guidelines, directions and circulars of India, including but not limited to the Indian Contract Act, 1872, the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023, the Consumer Protection Act, 2019, and directions issued by the Reserve Bank of India (“RBI”) from time to time, including the RBI Digital Lending Guidelines.",
      "“Borrowing Advisor” means, unless the context otherwise requires, a representative of TrueLend who engages with a User to understand their borrowing requirement and financial profile and to identify potentially suitable Partner Lenders.",
      "“Content” means, unless the context otherwise requires, all text, data, comparison tables, rate information, graphics, tools and material made available on the Platform, excluding information belonging to Partner Lenders.",
      "“Partner Lender” / “Lending Partner” means, unless the context otherwise requires, a bank, non-banking financial company (NBFC), housing finance company or other RBI-regulated or otherwise lawfully operating financial institution with which TrueLend has an arrangement to refer or route User enquiries.",
      "“Referral Partner” means, unless the context otherwise requires, an independent third party registered with TrueLend under its Referral Partner Network to refer prospective Users to the Platform.",
      "“Services” means, unless the context otherwise requires, the loan comparison, borrowing advisory, enquiry routing and related informational services made available by TrueLend through the Platform, as described in Clause 3.",
      "“User” means, unless the context otherwise requires, any individual or business entity who accesses or uses the Platform, submits an enquiry, or interacts with a Borrowing Advisor.",
      "Other capitalised terms shall have the meaning assigned to them elsewhere in these Terms.",
    ],
  },
  {
    heading: "2. Acceptance of Terms and Eligibility",
    paragraphs: [
      "2.1 Binding Agreement. Your access to or use of the Platform, submission of an enquiry, or engagement with a Borrowing Advisor constitutes unconditional acceptance of these Terms.",
      "2.2 Eligibility. You represent that you are (a) at least 18 years of age; (b) competent to contract under the Indian Contract Act, 1872; and (c) using the Platform for a lawful purpose consistent with these Terms. TrueLend may additionally require residency, documentation or other criteria specified by a Partner Lender for a particular credit product.",
      "2.3 Modes of Acceptance. Acceptance may occur through website use, account or enquiry-form registration, telephonic or WhatsApp communication with a Borrowing Advisor, or any other channel through which TrueLend offers the Services.",
      "2.4 Right to Refuse Access. TrueLend may, at its discretion, refuse, restrict or discontinue access to the Platform or Services to any person without assigning any reason, including where required for fraud prevention or regulatory compliance.",
    ],
  },
  {
    heading: "3. Scope of Services",
    paragraphs: [
      "3.1 Nature of the Platform. TrueLend operates a loan distribution and borrowing advisory platform. TrueLend is not a lender, bank or NBFC and does not itself sanction, disburse or hold any loan, credit facility or deposit unless expressly stated in writing.",
      "3.2 Facilitator Role. TrueLend facilitates comparison of, and connects Users with, Partner Lenders based on information voluntarily provided by the User. TrueLend does not act as agent of any Partner Lender unless separately disclosed, and does not act as agent of the User in dealings with a Partner Lender.",
      "3.3 Advisory Nature. Recommendations made by a Borrowing Advisor or generated through TrueLend’s internal assessment methodology are indicative and informational in nature, intended to help Users identify potentially suitable options, and do not constitute a credit decision, financial advice, or a binding recommendation.",
      "3.4 No Guarantee of Approval. TrueLend does not guarantee that any User will be eligible for, approved for, or offered a loan or credit product by any Partner Lender, or that indicative rates, amounts or terms will be honoured. All credit decisions, sanction terms and disbursement timelines rest solely with the relevant Partner Lender.",
      "3.5 Referral Partner Network. TrueLend may receive User enquiries through Referral Partners registered under its Referral Partner Network. TrueLend is responsible for its own conduct towards Users but is not responsible for representations made by a Referral Partner beyond the scope authorised by TrueLend in writing.",
    ],
  },
  {
    heading: "4. User Registration, Enquiries and Account Responsibilities",
    paragraphs: [
      "4.1 Accurate Information. You agree to provide true, accurate and complete information when submitting an enquiry or application, including personal and contact details, employment and income details, loan requirement details, and existing financial obligations, and to promptly update such information where it changes.",
      "4.2 Security of Credentials. Where TrueLend provides you with login credentials or an account, you are responsible for maintaining their confidentiality and for all activity conducted through your account.",
      "4.3 Consent to Communication. You consent to being contacted by TrueLend and its Borrowing Advisors by telephone, SMS, WhatsApp, email or other electronic means for purposes connected with your enquiry, the Services, and related updates, notwithstanding your registration on the National Do Not Disturb/National Customer Preference Register, to the extent permitted under Applicable Law.",
      "4.4 Electronic Records. These Terms, your acceptance, and related communications constitute electronic records under the Information Technology Act, 2000, and are valid and enforceable without requiring physical or digital signature, except where Applicable Law mandates otherwise.",
      "4.5 User Representations. You represent that you are acting on your own behalf (or, where applicable, on behalf of a business entity you are duly authorised to represent), and that you will not use the Platform to impersonate any person or for any fraudulent or unlawful purpose.",
    ],
  },
  {
    heading: "5. Customer Due Diligence and KYC",
    paragraphs: [
      "5.1 Identity and Financial Information. TrueLend may collect basic identification, contact, income and obligation-related information to assess your borrowing profile and route your enquiry to suitable Partner Lenders. Complete Know Your Customer (KYC) and Customer Due Diligence (CDD), as mandated by RBI norms, is conducted independently by the relevant Partner Lender before any credit decision.",
      "5.2 Credit Information. Where you avail features such as credit score access, you separately consent to TrueLend, and where applicable its technology or credit bureau partners, obtaining your credit information from Credit Information Companies registered under the Credit Information Companies (Regulation) Act, 2005, and sharing relevant information with prospective Partner Lenders solely for assessing your borrowing eligibility, in accordance with the Digital Personal Data Protection Act, 2023 and our Privacy Policy.",
      "5.3 Consequences of Non-Compliance. Incomplete, inaccurate or false information may result in rejection of your enquiry, denial of a loan offer by a Partner Lender, suspension of the Services to you, and, where applicable, reporting of such conduct to the relevant Partner Lender or authorities.",
      "5.4 Fraud Prevention. TrueLend may verify information provided by Users, decline or flag suspicious enquiries, and cooperate with Partner Lenders, regulators and law enforcement agencies in connection with suspected fraud or misuse.",
      "5.5 Regulatory Compliance. TrueLend shall, where it acts as a Lending Service Provider or Loan Service Provider in respect of any Partner Lender, comply with applicable disclosure and conduct requirements under the RBI Digital Lending Guidelines.",
    ],
  },
  {
    heading: "6. Third-Party Services, Partner Lenders and External Links",
    paragraphs: [
      "6.1 Independent Entities. Each Partner Lender is an independent entity, regulated (where applicable) by the RBI or other competent authority, and is solely responsible for its own credit policies, KYC processes, sanction terms, documentation and disbursement.",
      "6.2 Governing Terms. Any loan, credit facility or financial product you avail through a Partner Lender is governed by that Partner Lender’s own terms and conditions, sanction letter and loan agreement, which you must review independently before acceptance.",
      "6.3 No Responsibility for Lender Conduct. TrueLend is not responsible or liable for any act, omission, delay, service deficiency, misrepresentation or dispute arising from your relationship with a Partner Lender, including in relation to interest rates, charges, foreclosure terms or recovery practices.",
      "6.4 External Links. The Platform may contain links to, or information sourced from, third-party websites or Partner Lender pages. Such links are provided for convenience only and do not constitute an endorsement; TrueLend is not responsible for the content or practices of such third parties.",
      "6.5 Compensation Disclosure. TrueLend may receive referral fees, commissions or other compensation from Partner Lenders for enquiries or successful loan disbursements. Such compensation does not increase the cost of credit to the User unless separately and expressly disclosed, and does not guarantee preferential recommendation of any Partner Lender.",
    ],
  },
  {
    heading: "7. Fees, Charges and Payments",
    paragraphs: [
      "7.1 Advisory Services. As on the Effective Date, TrueLend does not charge Users any fee for its loan comparison and borrowing advisory Services.",
      "7.2 Lender Charges. Any processing fee, interest, prepayment charge, penal charge or other cost is levied solely by the Partner Lender in accordance with its sanction letter and key fact statement, and must be reviewed by the User prior to accepting a loan offer.",
      "7.3 No Handling of Loan Funds. TrueLend does not collect loan repayments, EMIs or disbursement amounts on behalf of any Partner Lender. All payment flows occur directly between the User and the Partner Lender or its authorised payment channel.",
      "7.4 Taxes. Any applicable taxes, including GST, on fees charged by TrueLend (if any) shall be borne by the User in addition to such fees, unless stated otherwise.",
      "7.5 Refunds. Where TrueLend introduces a fee-based service in the future, the applicable refund policy, if any, shall be published at the time such service is introduced.",
    ],
  },
  {
    heading: "8. Intellectual Property Rights",
    paragraphs: [
      "8.1 Ownership. The Platform, including its design, software, trademarks, logo, the name “TrueLend”, the Borrowing Intelligence Framework, and all Content (excluding third-party and Partner Lender content), is owned by TrueLend or its licensors and is protected under applicable intellectual property laws.",
      "8.2 Limited Licence. TrueLend grants you a limited, revocable, non-exclusive, non-transferable licence to access and use the Platform for your personal, non-commercial use, subject to compliance with these Terms.",
      "8.3 Restrictions. You shall not copy, reproduce, scrape, mirror, reverse-engineer, create derivative works from, or commercially exploit any part of the Platform or Content, including comparison tables and rate data, without TrueLend’s prior written consent.",
      "8.4 Trademarks. “TrueLend”, its logo and associated marks are proprietary to TrueLend. Nothing in these Terms grants you any right to use TrueLend’s trademarks without prior written authorisation.",
      "8.5 Feedback. Any suggestions or feedback you provide regarding the Platform may be used by TrueLend without restriction or compensation to you.",
    ],
  },
  {
    heading: "9. Disclaimers",
    paragraphs: [
      "9.1 Informational Nature. All interest rates, fees, eligibility criteria, approval probabilities and turnaround times displayed on the Platform are indicative, provided for comparison purposes only, and are subject to change by the relevant Partner Lender without notice.",
      "9.2 No Financial or Legal Advice. Guidance provided by a Borrowing Advisor or through the Platform is general in nature and does not constitute financial, investment, tax or legal advice. Users are encouraged to seek independent professional advice before making a borrowing decision.",
      "9.3 No Warranty. The Platform and Services are provided on an “as is” and “as available” basis, without warranties of any kind, whether express or implied, including as to accuracy, completeness, merchantability or fitness for a particular purpose, to the maximum extent permitted by Applicable Law.",
      "9.4 Service Availability. TrueLend does not warrant uninterrupted or error-free availability of the Platform and may suspend access for maintenance, upgrades or reasons beyond its reasonable control.",
      "9.5 Third-Party Accuracy. Rate and product information is sourced from Partner Lenders and may not reflect the most current terms. TrueLend is not liable for inaccuracies in information supplied by Partner Lenders.",
      "9.6 Regulatory Limitation. Nothing on the Platform constitutes a solicitation, offer or commitment to lend, and TrueLend is not a regulated lending entity for the purposes of the Banking Regulation Act, 1949 or the RBI Act, 1934.",
    ],
  },
  {
    heading: "10. Limitation of Liability and Indemnity",
    paragraphs: [
      "10.1 Liability Cap. To the maximum extent permitted by Applicable Law, TrueLend’s aggregate liability arising out of or in connection with the Services shall not exceed the fees, if any, paid by the User to TrueLend in the 3 (Three) months preceding the event giving rise to the claim, or INR 10,000 (Indian Rupees Ten Thousand Only), whichever is lower.",
      "10.2 Exclusion of Indirect Damages. TrueLend shall not be liable for any indirect, incidental, consequential, special or punitive damages, including loss of credit opportunity, loss of profit, or loss of data, arising from use of the Platform or Services.",
      "10.3 Indemnity by User. You agree to indemnify and hold TrueLend, its officers, employees and Borrowing Advisors harmless from any claim, loss, liability or expense (including reasonable legal fees) arising from your breach of these Terms, misuse of the Platform, provision of false information, or any fraud committed by you.",
      "10.4 Exceptions. Nothing in this Clause 10 shall limit or exclude liability for fraud, gross negligence or wilful misconduct on the part of TrueLend, to the extent such limitation is not permitted under Applicable Law.",
    ],
  },
  {
    heading: "11. Suspension and Termination",
    paragraphs: [
      "11.1 Grounds. TrueLend may suspend or terminate your access to the Platform for breach of these Terms, suspected fraud or misuse, misrepresentation, or upon the direction of a Partner Lender, regulator or law enforcement authority.",
      "11.2 Immediate Suspension. Where necessary to prevent fraud, security risk or regulatory non-compliance, TrueLend may suspend access immediately and without prior notice.",
      "11.3 Termination by User. You may discontinue use of the Platform at any time. Discontinuation does not affect obligations already accrued, including in respect of any loan availed through a Partner Lender.",
      "11.4 Effect of Termination. Upon termination, your right to access the Platform ceases, but any accrued rights, obligations or liabilities of either party shall not be affected.",
      "11.5 Survival. Clauses relating to Intellectual Property, Disclaimers, Limitation of Liability and Indemnity, and Governing Law shall survive termination of these Terms.",
    ],
  },
  {
    heading: "12. Governing Law and Dispute Resolution",
    paragraphs: [
      "12.1 Governing Law. These Terms shall be governed by and construed in accordance with the laws of India.",
      "12.2 Escalation. Users should first raise grievances with TrueLend’s customer support. TrueLend shall endeavour to acknowledge grievances within 48 (Forty-Eight) hours and resolve them within 30 (Thirty) days.",
      "12.3 Lender-Specific Grievances. Grievances relating specifically to the sanction, disbursement, servicing or recovery of a loan must additionally be raised with the concerned Partner Lender’s grievance redressal mechanism, and, where unresolved, may be escalated to the RBI Integrated Ombudsman Scheme or other applicable forum.",
      "12.4 Jurisdiction. Subject to Clause 12.4, the courts at Hyderabad, Telangana shall have exclusive jurisdiction over disputes arising out of or in connection with these Terms.",
      "12.5 Arbitration. Any dispute arising out of or in connection with these Terms, including its existence, validity or termination, shall be referred to and finally resolved by arbitration under the Arbitration and Conciliation Act, 1996. The arbitration shall be conducted by a sole arbitrator appointed by mutual consent of the parties, seated at Hyderabad, Telangana, in the English language, and the award shall be final and binding on the parties.",
    ],
  },
  {
    heading: "13. Changes to These Terms",
    paragraphs: [
      "13.1 Right to Modify. TrueLend may revise these Terms at any time to reflect changes in law, regulatory guidance, or the Services offered.",
      "13.2 Notice. Revised Terms shall be posted on the Platform with an updated “Last Updated” date. Material changes may additionally be notified through the Platform, email or SMS, where feasible.",
      "13.3 Continued Use. Your continued use of the Platform after revised Terms are posted constitutes acceptance of such revisions. If you do not agree, you must discontinue use of the Platform.",
    ],
  },
  {
    heading: "14. General",
    paragraphs: [
      "14.1 Severability. If any provision of these Terms is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.",
      "14.2 Waiver. No failure or delay by TrueLend in exercising any right under these Terms shall operate as a waiver of that right.",
      "14.3 Assignment. TrueLend may assign or transfer its rights and obligations under these Terms to an affiliate or successor entity. Users may not assign their rights under these Terms without TrueLend’s prior written consent.",
      "14.4 Entire Agreement. These Terms, together with the Privacy Policy and any service-specific terms expressly incorporated, constitute the entire agreement between you and TrueLend regarding use of the Platform.",
      "14.5 Force Majeure. TrueLend shall not be liable for any delay or failure in performance resulting from causes beyond its reasonable control, including natural disasters, regulatory action, internet or telecommunication failures, or other force majeure events.",
      "14.6 Relationship of Parties. Nothing in these Terms creates a partnership, joint venture, agency or employment relationship between you, TrueLend, any Referral Partner, or any Partner Lender.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Use"
        lede="The terms governing your access to and use of the TrueLend platform."
      />
      <Container className="max-w-3xl py-16 text-navy-700">
        <article className="space-y-10 text-[1.05rem] leading-8 tracking-[0.002em]">
          <div className="space-y-4">
            <p>
              These Terms of Use (“Terms”) constitute a legally binding agreement between you
              (“User”, “you” or “your”) and TRUE SOURCE DIGI TECH LLP, a limited liability
              partnership incorporated under the provisions of the Limited Liability Partnership
              Act, 2008 (the “Act”), read with the Limited Liability Partnership Rules, 2009 (the
              “Rules”) (“TrueLend”, “LLP”, “we”, “us” or “our”), operating an independent loan
              comparison and borrowing advisory platform that connects Users directly with Partner
              Lenders, governing your access to and use of the website{" "}
              <a href={appUrls.website} className="underline underline-offset-2">
                {appUrls.website}
              </a>
              , any subdomains, mobile applications and related services (together, the “Platform”).
            </p>
            <p>
              By accessing or using the Platform, you agree to be bound by these Terms and by our
              Privacy Policy, which is incorporated herein by reference. If you do not agree, you
              must discontinue use of the Platform.
            </p>
          </div>
          {terms.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="font-display text-xl font-bold tracking-tight text-navy-950">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </article>
        <p className="mt-10 border-t border-hairline pt-6 text-sm text-muted">
          Last updated: 25 July 2026.
        </p>
      </Container>
    </>
  );
}
