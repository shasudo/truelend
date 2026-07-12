import { pgTable, pgEnum, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const leadKind = pgEnum("lead_kind", ["enquiry", "referral", "contact", "cibil_notify"]);

/*
 * Every website form lands here; the future CRM reads from this table.
 * Columns are nullable by design — per-kind requiredness (e.g. cibil_notify
 * needs only email, enquiry needs name+phone) is enforced by zod at the form
 * boundary, not the database.
 */
export const leads = pgTable("leads", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
