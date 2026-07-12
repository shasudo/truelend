import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  bigint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Auth — table shapes owned by better-auth (admin plugin included).  */
/* Ids are text: better-auth generates its own ids. Do not redesign.  */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
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
});

export const session = pgTable("session", {
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
});

export const account = pgTable("account", {
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
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Leads — written by the public website, worked in the admin app.    */
/* ------------------------------------------------------------------ */

export const leadKind = pgEnum("lead_kind", ["enquiry", "referral", "contact", "cibil_notify"]);

export const leadStatus = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "docs_collected",
  "logged_in",
  "approved",
  "declined",
  "disbursed",
  "lost",
]);

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

    // referral-only
    referrerName: text("referrer_name"),
    referrerPhone: text("referrer_phone"),

    // campaign attribution (first touch)
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),

    consent: boolean("consent").notNull().default(false),

    // pipeline (admin app)
    status: leadStatus("status").notNull().default("new"),
    assignedTo: text("assigned_to").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("leads_status_idx").on(t.status), index("leads_assigned_to_idx").on(t.assignedTo)],
);

/** Append-only activity trail on a lead. */
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

export const loanCaseStatus = pgEnum("loan_case_status", [
  "logged_in",
  "approved",
  "declined",
  "disbursed",
]);

export const loanCases = pgTable(
  "loan_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),

    // slugs match the website's content data (content/banks.ts, content/products.ts)
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
  (t) => [index("loan_cases_lead_id_idx").on(t.leadId)],
);

/* ------------------------------------------------------------------ */

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadNote = typeof leadNotes.$inferSelect;
export type LoanCase = typeof loanCases.$inferSelect;
export type NewLoanCase = typeof loanCases.$inferInsert;
export type User = typeof user.$inferSelect;
