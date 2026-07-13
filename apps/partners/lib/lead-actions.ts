"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import Papa from "papaparse";
import { z } from "zod";
import { schema, type NewLead } from "@truelend/db";
import { products } from "@truelend/reference";
import { getAuthContext } from "./auth";

const productSlugs = products.map((p) => p.slug) as [string, ...string[]];

const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"));

const blank = (v: string | undefined) => (v && v.length > 0 ? v : null);

async function verifiedPartner() {
  const { db, ctx, auth } = getAuthContext();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { db, ctx, partner: null };
  const rows = await db
    .select()
    .from(schema.partners)
    .where(eq(schema.partners.userId, session.user.id))
    .limit(1);
  const partner = rows[0];
  return { db, ctx, partner: partner?.status === "verified" ? partner : null };
}

/* ---- single lead ---- */

const leadSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone,
  email: z.email().or(z.literal("")).optional(),
  city: z.string().trim().max(100).optional(),
  productSlug: z.enum(productSlugs).or(z.literal("")).optional(),
  message: z.string().trim().max(2000).optional(),
});

export type LeadState = { ok?: boolean; error?: string };

export async function submitLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const { db, ctx, partner } = await verifiedPartner();
  if (!partner) return { error: "Your account isn't verified yet." };
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
  const d = parsed.data;
  try {
    await db.insert(schema.leads).values({
      kind: partner.type === "referral" ? "referral" : "enquiry",
      partnerId: partner.userId,
      consent: true,
      name: d.name,
      phone: d.phone,
      email: blank(d.email),
      city: blank(d.city),
      productSlug: blank(d.productSlug),
      message: blank(d.message),
    });
    revalidatePath("/dashboard");
    return { ok: true };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

/* ---- bulk CSV (business partners) ---- */

export type CsvState = { ok?: boolean; error?: string; inserted?: number; rowErrors?: string[] };

// Lenient per-row parse: name + phone required; product accepts a slug.
const csvRow = z.object({
  name: z.string().trim().min(2),
  phone,
  email: z.string().trim().optional(),
  city: z.string().trim().optional(),
  product: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export async function submitLeadsCsv(_prev: CsvState, formData: FormData): Promise<CsvState> {
  const { db, ctx, partner } = await verifiedPartner();
  if (!partner) return { error: "Your account isn't verified yet." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to upload." };
  if (file.size > 1_000_000) return { error: "CSV too large (max 1MB)." };

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const validSlugs = new Set(productSlugs);
  const values: NewLead[] = [];
  const rowErrors: string[] = [];

  parsed.data.forEach((raw, i) => {
    const r = csvRow.safeParse(raw);
    if (!r.success) {
      rowErrors.push(`Row ${i + 2}: ${r.error.issues[0]?.message ?? "invalid"}`);
      return;
    }
    const d = r.data;
    values.push({
      kind: "enquiry",
      partnerId: partner.userId,
      consent: true,
      name: d.name,
      phone: d.phone,
      email: blank(d.email),
      city: blank(d.city),
      productSlug: d.product && validSlugs.has(d.product) ? d.product : null,
      message: blank(d.message),
    });
  });

  if (values.length === 0) {
    return { error: "No valid rows found. Check the columns and try again.", rowErrors };
  }

  try {
    await db.insert(schema.leads).values(values);
    revalidatePath("/dashboard");
    return { ok: true, inserted: values.length, rowErrors };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
