import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  bigint,
  date,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  employmentTypeValues,
  leadKindValues,
  leadStatusValues,
  loanCaseStatusValues,
  partnerDocumentTypeValues,
  partnerStatusValues,
  payoutKindValues,
  residenceTypeValues,
} from "@truelend/reference";

/* ------------------------------------------------------------------ */
/* Auth — table shapes owned by better-auth (admin plugin included).  */
/* Ids are text: better-auth generates its own ids. Do not redesign.  */
/* ------------------------------------------------------------------ */

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    // admin plugin
    role: text("role"),
    banned: boolean("banned"),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "user_role_valid",
      sql`${t.role} is null or ${t.role} in ('admin', 'employee', 'referral', 'partner_pending')`,
    ),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // admin plugin
    impersonatedBy: text("impersonated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("session_user_id_idx").on(t.userId),
    index("session_expires_at_idx").on(t.expiresAt),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("account_user_id_idx").on(t.userId),
    uniqueIndex("account_provider_account_idx").on(t.providerId, t.accountId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const leadKind = pgEnum("lead_kind", leadKindValues);
export const leadStatus = pgEnum("lead_status", leadStatusValues);
export const employmentType = pgEnum("employment_type", employmentTypeValues);
export const residenceType = pgEnum("residence_type", residenceTypeValues);

/*
 * Columns are nullable by design — per-kind requiredness (e.g. cibil_notify
 * needs only email) is enforced by zod at the form boundary, not the database.
 */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: leadKind("kind").notNull(),

    name: text("name"),
    phone: text("phone"),
    email: text("email"),
    city: text("city"),
    productSlug: text("product_slug"),
    message: text("message"),

    // Loan-application detail captured by the detailed lead forms. Requiredness
    // is enforced per-form by zod; the columns stay nullable (Referral Partner
    // and older leads may omit them). Money is integer paise, converted at the boundary.
    loanAmountPaise: bigint("loan_amount_paise", { mode: "number" }),
    tenureMonths: integer("tenure_months"),
    loanPurpose: text("loan_purpose"),
    pincode: text("pincode"),
    residenceType: residenceType("residence_type"),
    employmentType: employmentType("employment_type"),
    monthlyIncomePaise: bigint("monthly_income_paise", { mode: "number" }),
    employerName: text("employer_name"),
    experienceYears: integer("experience_years"),
    existingEmiPaise: bigint("existing_emi_paise", { mode: "number" }),
    assetValuePaise: bigint("asset_value_paise", { mode: "number" }),
    annualTurnoverPaise: bigint("annual_turnover_paise", { mode: "number" }),
    preferredEmiPaise: bigint("preferred_emi_paise", { mode: "number" }),
    outstandingLoanAmountPaise: bigint("outstanding_loan_amount_paise", { mode: "number" }),
    creditCardOutstandingPaise: bigint("credit_card_outstanding_paise", { mode: "number" }),
    existingWithEmployer: text("existing_with_employer"),

    referrerName: text("referrer_name"),
    referrerPhone: text("referrer_phone"),

    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmLastSource: text("utm_last_source"),
    utmLastMedium: text("utm_last_medium"),
    utmLastCampaign: text("utm_last_campaign"),

    consent: boolean("consent").notNull().default(false),
    // Proof of the consent above: when it was captured, from where (website
    // form or Referral Partner submission), and which terms/privacy version.
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentSource: text("consent_source"),
    consentVersion: text("consent_version"),

    status: leadStatus("status").notNull().default("new"),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),

    // sourced by a Referral Partner (null = website/direct). Channel derives from this.
    partnerId: text("partner_id").references(() => partners.userId, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("leads_status_idx").on(t.status),
    index("leads_assigned_to_idx").on(t.assignedTo),
    index("leads_partner_id_idx").on(t.partnerId),
    index("leads_created_at_idx").on(t.createdAt),
    check(
      "leads_required_fields",
      sql`(${t.kind} = 'enquiry' and ${t.name} is not null and ${t.phone} is not null)
        or (${t.kind} = 'referral' and ${t.name} is not null and ${t.phone} is not null and ${t.referrerName} is not null and ${t.referrerPhone} is not null)
        or (${t.kind} = 'contact' and ${t.name} is not null and ${t.phone} is not null and ${t.message} is not null)
        or (${t.kind} = 'cibil_notify' and ${t.email} is not null)`,
    ),
    check(
      "leads_consent_proof",
      sql`${t.consent} = false or (${t.consentAt} is not null and ${t.consentSource} is not null and ${t.consentVersion} is not null)`,
    ),
    check(
      "leads_application_amounts_valid",
      sql`(${t.loanAmountPaise} is null or (${t.loanAmountPaise} >= 0 and ${t.loanAmountPaise} <= 9007199254740991))
        and (${t.monthlyIncomePaise} is null or (${t.monthlyIncomePaise} >= 0 and ${t.monthlyIncomePaise} <= 9007199254740991))
        and (${t.existingEmiPaise} is null or (${t.existingEmiPaise} >= 0 and ${t.existingEmiPaise} <= 9007199254740991))
        and (${t.assetValuePaise} is null or (${t.assetValuePaise} >= 0 and ${t.assetValuePaise} <= 9007199254740991))
        and (${t.annualTurnoverPaise} is null or (${t.annualTurnoverPaise} >= 0 and ${t.annualTurnoverPaise} <= 9007199254740991))
        and (${t.preferredEmiPaise} is null or (${t.preferredEmiPaise} >= 0 and ${t.preferredEmiPaise} <= 9007199254740991))
        and (${t.outstandingLoanAmountPaise} is null or (${t.outstandingLoanAmountPaise} >= 0 and ${t.outstandingLoanAmountPaise} <= 9007199254740991))
        and (${t.creditCardOutstandingPaise} is null or (${t.creditCardOutstandingPaise} >= 0 and ${t.creditCardOutstandingPaise} <= 9007199254740991))
        and (${t.tenureMonths} is null or (${t.tenureMonths} >= 0 and ${t.tenureMonths} <= 600))
        and (${t.experienceYears} is null or (${t.experienceYears} >= 0 and ${t.experienceYears} <= 100))`,
    ),
  ],
);

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lead_notes_lead_id_idx").on(t.leadId)],
);

/* ------------------------------------------------------------------ */
/* Loan cases — one lead can have many (declined at one lender,       */
/* approved at another). All money is integer paise: exact, sortable, */
/* SQL-aggregable; JS-number-safe to ~₹90 trillion.                   */
/* ------------------------------------------------------------------ */

export const loanCaseStatus = pgEnum("loan_case_status", loanCaseStatusValues);

export const loanCases = pgTable(
  "loan_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),

    // Slugs are the canonical @truelend/reference product and lender identifiers.
    lenderSlug: text("lender_slug").notNull(),
    productSlug: text("product_slug").notNull(),

    requestedAmountPaise: bigint("requested_amount_paise", { mode: "number" }),
    sanctionedAmountPaise: bigint("sanctioned_amount_paise", { mode: "number" }),
    disbursedAmountPaise: bigint("disbursed_amount_paise", { mode: "number" }),

    status: loanCaseStatus("status").notNull().default("logged_in"),

    // the commercial ledger: net = revenue − payout
    revenuePaise: bigint("revenue_paise", { mode: "number" }),
    payoutPaise: bigint("payout_paise", { mode: "number" }),

    // per-status timestamps → turnaround-time MIS
    loggedInAt: timestamp("logged_in_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    disbursedAt: timestamp("disbursed_at", { withTimezone: true }),

    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("loan_cases_lead_id_idx").on(t.leadId),
    index("loan_cases_created_at_idx").on(t.createdAt),
    check(
      "loan_cases_amounts_nonnegative",
      sql`(${t.requestedAmountPaise} is null or ${t.requestedAmountPaise} >= 0)
        and (${t.sanctionedAmountPaise} is null or ${t.sanctionedAmountPaise} >= 0)
        and (${t.disbursedAmountPaise} is null or ${t.disbursedAmountPaise} >= 0)
        and (${t.revenuePaise} is null or ${t.revenuePaise} >= 0)
        and (${t.payoutPaise} is null or ${t.payoutPaise} >= 0)
        and (${t.requestedAmountPaise} is null or ${t.requestedAmountPaise} <= 9007199254740991)
        and (${t.sanctionedAmountPaise} is null or ${t.sanctionedAmountPaise} <= 9007199254740991)
        and (${t.disbursedAmountPaise} is null or ${t.disbursedAmountPaise} <= 9007199254740991)
        and (${t.revenuePaise} is null or ${t.revenuePaise} <= 9007199254740991)
        and (${t.payoutPaise} is null or ${t.payoutPaise} <= 9007199254740991)`,
    ),
  ],
);

export const partnerStatus = pgEnum("partner_status", partnerStatusValues);
export const partnerDocType = pgEnum("partner_doc_type", partnerDocumentTypeValues);
export const payoutKind = pgEnum("payout_kind", payoutKindValues);

// 1:1 with a better-auth referral-partner user (user_id is the PK).
export const partners = pgTable(
  "partners",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    status: partnerStatus("status").notNull().default("pending"),
    // Human-readable RP<seq> reference generated at signup from the
    // partners_reference_seq sequence. Unique per referral partner.
    referenceId: text("reference_id").notNull().unique(),
    phone: text("phone"),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    city: text("city"),
    referralType: text("referral_type"),
    pan: text("pan"),

    // Referral-partner professional profile.
    occupation: text("occupation"),
    designation: text("designation"),
    experienceNote: text("experience_note"),

    // Current address.
    address: text("address"),

    // Bank account for payouts/incentives
    bankName: text("bank_name"),
    accountHolder: text("account_holder"),
    accountNumber: text("account_number"),
    bankBranch: text("bank_branch"),
    ifsc: text("ifsc"),

    // Nominee (aadhaar is PII: stored, never copied into the audit trail)
    nomineeName: text("nominee_name"),
    nomineeAadhaar: text("nominee_aadhaar"),
    nomineePhone: text("nominee_phone"),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    verifiedBy: text("verified_by").references(() => user.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check(
      "partners_review_state_valid",
      sql`(${t.status} <> 'verified' or (
          ${t.verifiedBy} is not null
          and ${t.verifiedAt} is not null
          and ${t.submittedAt} is not null
          and ${t.rejectionReason} is null
          and ${t.pan} is not null and length(trim(${t.pan})) > 0
          and ${t.address} is not null and length(trim(${t.address})) > 0
          and ${t.accountHolder} is not null and length(trim(${t.accountHolder})) > 0
          and ${t.accountNumber} is not null and length(trim(${t.accountNumber})) > 0
          and ${t.ifsc} is not null and length(trim(${t.ifsc})) > 0
        ))
        and (${t.status} <> 'rejected' or (
          ${t.verifiedBy} is not null
          and ${t.verifiedAt} is not null
          and ${t.rejectionReason} is not null
          and length(trim(${t.rejectionReason})) > 0
        ))`,
    ),
  ],
);

// KYC uploads, kept in R2 (r2_key); one row per uploaded document.
export const partnerDocuments = pgTable(
  "partner_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: text("partner_id")
      .notNull()
      .references(() => partners.userId, { onDelete: "cascade" }),
    docType: partnerDocType("doc_type").notNull(),
    r2Key: text("r2_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("partner_documents_partner_id_idx").on(t.partnerId),
    uniqueIndex("partner_documents_partner_type_idx").on(t.partnerId, t.docType),
    check("partner_documents_size_positive", sql`${t.sizeBytes} > 0 and ${t.sizeBytes} <= 5242880`),
    check(
      "partner_documents_storage_valid",
      sql`${t.r2Key} like 'kyc/%' and ${t.contentType} in ('image/jpeg', 'image/png', 'application/pdf')`,
    ),
  ],
);

// Manual ledger: admin records `earned` and `paid` entries; balance = sum diff.
export const partnerPayouts = pgTable(
  "partner_payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partnerId: text("partner_id")
      .notNull()
      .references(() => partners.userId, { onDelete: "cascade" }),
    loanCaseId: uuid("loan_case_id").references(() => loanCases.id, { onDelete: "set null" }),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    kind: payoutKind("kind").notNull(),
    note: text("note"),
    // Which admin recorded this entry (set null if that user is later removed —
    // the audit_log keeps a denormalized copy regardless).
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("partner_payouts_partner_id_idx").on(t.partnerId),
    check("partner_payouts_amount_positive", sql`${t.amountPaise} > 0`),
  ],
);

/*
 * Append-only audit trail: who did what to which entity, with optional
 * before/after snapshots. Insert-only in application code — never updated or
 * deleted. actor_id is NOT a foreign key and actor_email is denormalized so the
 * record survives (and stays truthful) even if the user is later removed.
 * Migration 0005 installs a trigger that rejects UPDATE and DELETE.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id"),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_actor_idx").on(t.actorId),
    index("audit_log_created_at_idx").on(t.createdAt),
  ],
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadNote = typeof leadNotes.$inferSelect;
export type LoanCase = typeof loanCases.$inferSelect;
export type NewLoanCase = typeof loanCases.$inferInsert;
export type User = typeof user.$inferSelect;
export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;
export type PartnerDocument = typeof partnerDocuments.$inferSelect;
export type PartnerPayout = typeof partnerPayouts.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
