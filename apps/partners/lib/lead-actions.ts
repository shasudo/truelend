"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import Papa from "papaparse";
import { z } from "zod";
import { schema, type NewLead } from "@truelend/db";
import { products, productName, partnerTypeLabels } from "@truelend/reference";
import { notifyBulkLeadImport, notifyNewLead } from "@truelend/email";
import { getAuthContext } from "./auth";

const productSlugs = products.map((p) => p.slug) as [string, ...string[]];
const CONSENT_VERSION = "2026-07-13";
const MAX_CSV_ROWS = 1_000;
const MAX_ROW_ERRORS = 50;

const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"));

const blank = (v: string | undefined) => (v && v.length > 0 ? v : null);

async function verifiedPartner() {
  const { db, ctx, auth, env } = getAuthContext();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { db, ctx, env, partner: null };
    const rows = await db
      .select()
      .from(schema.partners)
      .where(eq(schema.partners.userId, session.user.id))
      .limit(1);
    const partner = rows[0];
    return { db, ctx, env, partner: partner?.status === "verified" ? partner : null };
  } catch (error) {
    ctx.waitUntil(db.$client.end());
    throw error;
  }
}

const partnerSource = (p: { type: string; businessName: string | null }) =>
  `${partnerTypeLabels[p.type]}${p.businessName ? `: ${p.businessName}` : ""}`;

const leadSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  phone,
  email: z.email().max(254).or(z.literal("")).optional(),
  city: z.string().trim().max(100).optional(),
  productSlug: z.enum(productSlugs).or(z.literal("")).optional(),
  message: z.string().trim().max(2000).optional(),
  consent: z.literal("on", { error: "Confirm the customer's consent before submitting." }),
});

export type LeadState = { ok?: boolean; error?: string };

export async function submitLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const { db, ctx, env, partner } = await verifiedPartner();
  try {
    if (!partner) return { error: "Your account isn't verified yet." };
    if (!(await env.PARTNER_WRITE_RATE_LIMITER.limit({ key: `lead:${partner.userId}` })).success) {
      return { error: "Too many submissions. Please wait a minute and try again." };
    }
    const parsed = leadSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
    const d = parsed.data;
    const consentAt = new Date();
    await db.transaction(async (tx) => {
      const [lead] = await tx
        .insert(schema.leads)
        .values({
          kind: partner.type === "referral" ? "referral" : "enquiry",
          partnerId: partner.userId,
          consent: true,
          consentAt,
          consentSource: "partner_form",
          consentVersion: CONSENT_VERSION,
          name: d.name,
          phone: d.phone,
          email: blank(d.email),
          city: blank(d.city),
          productSlug: blank(d.productSlug),
          message: blank(d.message),
        })
        .returning({ id: schema.leads.id });
      await tx.insert(schema.auditLog).values({
        actorId: partner.userId,
        action: "lead.create",
        entityType: "lead",
        entityId: lead?.id,
        after: { source: "partner_form", consentVersion: CONSENT_VERSION },
      });
    });
    ctx.waitUntil(
      notifyNewLead(env, {
        name: d.name,
        phone: d.phone,
        email: blank(d.email),
        city: blank(d.city),
        product: d.productSlug ? productName(d.productSlug) : undefined,
        message: blank(d.message),
        source: partnerSource(partner),
      }),
    );
    revalidatePath("/dashboard");
    return { ok: true };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

export type CsvState = { ok?: boolean; error?: string; inserted?: number; rowErrors?: string[] };

// Lenient per-row parse: name + phone required; product accepts a slug.
const csvRow = z.object({
  name: z.string().trim().min(2).max(120),
  phone,
  email: z.email().max(254).or(z.literal("")).optional(),
  city: z.string().trim().max(100).optional(),
  product: z.enum(productSlugs).or(z.literal("")).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function submitLeadsCsv(_prev: CsvState, formData: FormData): Promise<CsvState> {
  const { db, ctx, env, partner } = await verifiedPartner();
  try {
    if (!partner) return { error: "Your account isn't verified yet." };
    if (partner.type !== "business") return { error: "CSV import is for business partners." };
    if (!(await env.CSV_IMPORT_RATE_LIMITER.limit({ key: partner.userId })).success) {
      return { error: "CSV import is limited to two files per minute. Please wait and try again." };
    }
    if (formData.get("consent") !== "on") {
      return { error: "Confirm that every person in the CSV consented to be contacted." };
    }
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0)
      return { error: "Choose a CSV file to upload." };
    if (file.size > 1_000_000) return { error: "CSV too large (max 1MB)." };

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });
    if (parsed.errors.length > 0) {
      return {
        error: `The CSV could not be parsed: ${parsed.errors[0]?.message ?? "invalid CSV"}`,
      };
    }
    if (parsed.data.length > MAX_CSV_ROWS) {
      return { error: `CSV has too many rows (max ${MAX_CSV_ROWS.toLocaleString("en-IN")}).` };
    }

    const consentAt = new Date();
    const values: NewLead[] = [];
    const rowErrors: string[] = [];
    let errorCount = 0;
    parsed.data.forEach((raw, index) => {
      const result = csvRow.safeParse(raw);
      if (!result.success) {
        errorCount += 1;
        if (rowErrors.length < MAX_ROW_ERRORS) {
          rowErrors.push(`Row ${index + 2}: ${result.error.issues[0]?.message ?? "invalid value"}`);
        }
        return;
      }
      const data = result.data;
      values.push({
        kind: "enquiry",
        partnerId: partner.userId,
        consent: true,
        consentAt,
        consentSource: "partner_csv",
        consentVersion: CONSENT_VERSION,
        name: data.name,
        phone: data.phone,
        email: blank(data.email),
        city: blank(data.city),
        productSlug: blank(data.product),
        message: blank(data.message),
      });
    });
    if (errorCount > rowErrors.length) {
      rowErrors.push(`${errorCount - rowErrors.length} additional invalid rows not shown.`);
    }
    if (values.length === 0) {
      return { error: "No valid rows found. Check the columns and try again.", rowErrors };
    }

    await db.transaction(async (tx) => {
      await tx.insert(schema.leads).values(values);
      await tx.insert(schema.auditLog).values({
        actorId: partner.userId,
        action: "lead.bulk_create",
        entityType: "lead_batch",
        entityId: crypto.randomUUID(),
        after: {
          source: "partner_csv",
          inserted: values.length,
          rejected: errorCount,
          consentVersion: CONSENT_VERSION,
        },
      });
    });
    // One summary alert for the whole batch (not N emails).
    ctx.waitUntil(
      notifyBulkLeadImport(env, { source: partnerSource(partner), count: values.length }),
    );
    revalidatePath("/dashboard");
    return { ok: true, inserted: values.length, rowErrors };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
