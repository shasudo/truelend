"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema, type Database, type NewLoanCase } from "@truelend/db";
import { getMutationContext } from "./auth";
import { rupeesToPaise } from "./format";

type CaseStatus = (typeof schema.loanCaseStatus.enumValues)[number];

// A loan case's status drives the parent lead's pipeline position.
const leadStatusForCase: Record<CaseStatus, (typeof schema.leadStatus.enumValues)[number]> = {
  logged_in: "logged_in",
  approved: "approved",
  declined: "declined",
  disbursed: "disbursed",
};

const leadOrder = schema.leadStatus.enumValues;

// Move the parent lead forward to match a case's status — never backward, so
// editing an old case can't rewind a lead that's already further along.
async function advanceLeadStatus(db: Database, leadId: string, caseStatus: CaseStatus) {
  const target = leadStatusForCase[caseStatus];
  const rows = await db
    .select({ status: schema.leads.status })
    .from(schema.leads)
    .where(eq(schema.leads.id, leadId))
    .limit(1);
  const current = rows[0]?.status;
  if (!current || leadOrder.indexOf(target) <= leadOrder.indexOf(current)) return;
  await db.update(schema.leads).set({ status: target }).where(eq(schema.leads.id, leadId));
}

// Which timestamp column records when a case reached each status.
const timestampField: Record<
  CaseStatus,
  "loggedInAt" | "approvedAt" | "declinedAt" | "disbursedAt"
> = {
  logged_in: "loggedInAt",
  approved: "approvedAt",
  declined: "declinedAt",
  disbursed: "disbursedAt",
};

const amounts = {
  requestedAmount: z.string().optional(),
  sanctionedAmount: z.string().optional(),
  disbursedAmount: z.string().optional(),
  revenue: z.string().optional(),
  payout: z.string().optional(),
};

function amountPaise(d: Record<string, string | undefined>) {
  return {
    requestedAmountPaise: rupeesToPaise(d.requestedAmount),
    sanctionedAmountPaise: rupeesToPaise(d.sanctionedAmount),
    disbursedAmountPaise: rupeesToPaise(d.disbursedAmount),
    revenuePaise: rupeesToPaise(d.revenue),
    payoutPaise: rupeesToPaise(d.payout),
  };
}

const createSchema = z.object({
  leadId: z.string().uuid(),
  lenderSlug: z.string().min(1),
  productSlug: z.string().min(1),
  status: z.enum(schema.loanCaseStatus.enumValues),
  ...amounts,
});

export async function createLoanCaseAction(formData: FormData) {
  const { db, ctx, user } = await getMutationContext();
  if (!user) return;
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const d = parsed.data;

  let newId: string | undefined;
  try {
    const values: NewLoanCase = {
      leadId: d.leadId,
      lenderSlug: d.lenderSlug,
      productSlug: d.productSlug,
      status: d.status,
      createdBy: user.id,
      ...amountPaise(d),
      [timestampField[d.status]]: new Date(),
    };
    const inserted = await db
      .insert(schema.loanCases)
      .values(values)
      .returning({ id: schema.loanCases.id });
    newId = inserted[0]?.id;
    await advanceLeadStatus(db, d.leadId, d.status);
    revalidatePath(`/leads/${d.leadId}`);
    revalidatePath("/loan-cases");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
  if (newId) redirect(`/loan-cases/${newId}`);
}

const updateSchema = z.object({
  caseId: z.string().uuid(),
  lenderSlug: z.string().min(1),
  productSlug: z.string().min(1),
  status: z.enum(schema.loanCaseStatus.enumValues),
  ...amounts,
});

export async function updateLoanCaseAction(formData: FormData) {
  const { db, ctx, user } = await getMutationContext();
  if (!user) return;
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const d = parsed.data;

  try {
    const existing = (
      await db.select().from(schema.loanCases).where(eq(schema.loanCases.id, d.caseId)).limit(1)
    )[0];
    if (!existing) return;

    const tsField = timestampField[d.status];
    const set: Partial<NewLoanCase> = {
      lenderSlug: d.lenderSlug,
      productSlug: d.productSlug,
      status: d.status,
      ...amountPaise(d),
    };
    // Stamp the status timestamp the first time it's reached.
    if (!existing[tsField]) set[tsField] = new Date();

    await db.update(schema.loanCases).set(set).where(eq(schema.loanCases.id, d.caseId));
    await advanceLeadStatus(db, existing.leadId, d.status);

    revalidatePath(`/loan-cases/${d.caseId}`);
    revalidatePath(`/leads/${existing.leadId}`);
    revalidatePath("/loan-cases");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
