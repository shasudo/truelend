"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { schema, type Database, type NewLoanCase } from "@truelend/db";
import { getMutationContext } from "./auth";
import { banks, products, rupeesToPaise } from "@truelend/reference";

type CaseStatus = (typeof schema.loanCaseStatus.enumValues)[number];

// A loan case's status drives the parent lead's pipeline position.
// The root db or a transaction handle — recomputeLeadStatus runs inside both.
type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

const leadStatusForCase: Record<CaseStatus, (typeof schema.leadStatus.enumValues)[number]> = {
  logged_in: "logged_in",
  approved: "approved",
  declined: "declined",
  disbursed: "disbursed",
};

// Business precedence of a loan-case outcome, best first. A lead can have many
// lender cases; its pipeline position is the BEST outcome across all of them —
// one lender declining must never override another approving or disbursing.
// (The old code used enum declaration order as precedence, which put declined
// after approved and looked at only the edited case — both wrong.)
const CASE_OUTCOME_RANK = ["disbursed", "approved", "logged_in", "declined"] as const;

// Best outcome among a lead's cases, or null if it has none. Pure; kept local
// because this is a "use server" module (every export must be an async action).
function bestCaseOutcome(statuses: CaseStatus[]): CaseStatus | null {
  return CASE_OUTCOME_RANK.find((s) => statuses.includes(s)) ?? null;
}

// Recompute the parent lead's status from ALL its lender cases. Runs on every
// case create/update, so editing an old case reflects the true aggregate rather
// than rewinding or clobbering the lead from a single case.
async function recomputeLeadStatus(db: Executor, leadId: string) {
  const cases = await db
    .select({ status: schema.loanCases.status })
    .from(schema.loanCases)
    .where(eq(schema.loanCases.leadId, leadId));
  const best = bestCaseOutcome(cases.map((c) => c.status));
  if (!best) return;
  const target = leadStatusForCase[best];
  await db
    .update(schema.leads)
    .set({ status: target })
    .where(and(eq(schema.leads.id, leadId), ne(schema.leads.status, target)));
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

const optionalAmount = z
  .string()
  .trim()
  .max(24)
  .optional()
  .refine((value) => !value || rupeesToPaise(value) !== null, "Enter a valid amount");

const amounts = {
  requestedAmount: optionalAmount,
  sanctionedAmount: optionalAmount,
  disbursedAmount: optionalAmount,
  revenue: optionalAmount,
  payout: optionalAmount,
};

const lenderSlugs = banks.map((bank) => bank.slug) as [string, ...string[]];
const productSlugs = products.map((product) => product.slug) as [string, ...string[]];

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
  lenderSlug: z.enum(lenderSlugs),
  productSlug: z.enum(productSlugs),
  status: z.enum(schema.loanCaseStatus.enumValues),
  ...amounts,
});

export async function createLoanCaseAction(formData: FormData) {
  const { db, ctx, user } = await getMutationContext();
  let newId: string | undefined;
  try {
    if (!user) redirect("/login"); // expired session → explain, don't eat the click
    const parsed = createSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return;
    const d = parsed.data;
    const values: NewLoanCase = {
      leadId: d.leadId,
      lenderSlug: d.lenderSlug,
      productSlug: d.productSlug,
      status: d.status,
      createdBy: user.id,
      ...amountPaise(d),
      [timestampField[d.status]]: new Date(),
    };
    // Case insert + parent-lead recompute must land together, or the lead's
    // pipeline position can disagree with its cases.
    await db.transaction(async (tx) => {
      // Serialize all case changes for the same lead so two concurrent writes
      // cannot each recompute from an incomplete view and leave a stale status.
      await tx.execute(
        sql`select 1 from ${schema.leads} where ${schema.leads.id} = ${d.leadId} for update`,
      );
      const inserted = await tx
        .insert(schema.loanCases)
        .values(values)
        .returning({ id: schema.loanCases.id });
      newId = inserted[0]?.id;
      await recomputeLeadStatus(tx, d.leadId);
      await tx.insert(schema.auditLog).values({
        actorId: user.id,
        actorEmail: user.email,
        action: "loan_case.create",
        entityType: "loan_case",
        entityId: newId,
        after: values,
      });
    });
    revalidatePath(`/leads/${d.leadId}`);
    revalidatePath("/loan-cases");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
  if (newId) redirect(`/loan-cases/${newId}`);
}

const updateSchema = z.object({
  caseId: z.string().uuid(),
  lenderSlug: z.enum(lenderSlugs),
  productSlug: z.enum(productSlugs),
  status: z.enum(schema.loanCaseStatus.enumValues),
  ...amounts,
});

export async function updateLoanCaseAction(formData: FormData) {
  const { db, ctx, user } = await getMutationContext();
  try {
    if (!user) redirect("/login"); // expired session → explain, don't eat the click
    const parsed = updateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return;
    const d = parsed.data;
    let leadId: string | undefined;

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.loanCases)
        .where(eq(schema.loanCases.id, d.caseId))
        .limit(1)
        .for("update");
      if (!existing) return;
      leadId = existing.leadId;
      await tx.execute(
        sql`select 1 from ${schema.leads} where ${schema.leads.id} = ${existing.leadId} for update`,
      );
      const tsField = timestampField[d.status];
      const set: Partial<NewLoanCase> = {
        lenderSlug: d.lenderSlug,
        productSlug: d.productSlug,
        status: d.status,
        ...amountPaise(d),
      };
      // Stamp the status timestamp the first time it's reached.
      if (!existing[tsField]) set[tsField] = new Date();
      await tx.update(schema.loanCases).set(set).where(eq(schema.loanCases.id, d.caseId));
      await recomputeLeadStatus(tx, existing.leadId);
      await tx.insert(schema.auditLog).values({
        actorId: user.id,
        actorEmail: user.email,
        action: "loan_case.update",
        entityType: "loan_case",
        entityId: d.caseId,
        before: existing,
        after: set,
      });
    });

    if (!leadId) return;
    revalidatePath(`/loan-cases/${d.caseId}`);
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/loan-cases");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
