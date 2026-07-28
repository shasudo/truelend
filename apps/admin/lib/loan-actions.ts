"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { schema, type Database, type NewLoanCase } from "@truelend/db";
import { getMutationContext } from "./auth";
import { errorType } from "./error-type";
import { scheduleAdminRequestContextCleanup } from "./request-context-cleanup";
import { banks, bestLoanCaseOutcome, productSlugs, rupeesToPaise } from "@truelend/reference";

export type LoanActionResult = { ok?: boolean; error?: string };

type CaseStatus = (typeof schema.loanCaseStatus.enumValues)[number];

const UNKNOWN_CREATE_OUTCOME =
  "We couldn't confirm whether the loan case was created. Reload the lead's loan cases before trying again.";
const UNKNOWN_UPDATE_OUTCOME =
  "We couldn't confirm the case update. Reload this page before trying again.";

function reportLoanActionFailure(event: string, error: unknown): void {
  console.error(JSON.stringify({ event, errorType: errorType(error) }));
}

// A loan case's status drives the parent lead's pipeline position.
// The root db or a transaction handle — recomputeLeadStatus runs inside both.
type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

const leadStatusForCase: Record<CaseStatus, (typeof schema.leadStatus.enumValues)[number]> = {
  logged_in: "logged_in",
  approved: "approved",
  declined: "declined",
  disbursed: "disbursed",
};

// Recompute the parent lead's status from ALL its lender cases. Runs on every
// case create/update, so editing an old case reflects the true aggregate rather
// than rewinding or clobbering the lead from a single case.
async function recomputeLeadStatus(db: Executor, leadId: string) {
  const cases = await db
    .select({ status: schema.loanCases.status })
    .from(schema.loanCases)
    .where(eq(schema.loanCases.leadId, leadId));
  const best = bestLoanCaseOutcome(cases.map((c) => c.status));
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

export async function createLoanCaseAction(
  _prev: LoanActionResult,
  formData: FormData,
): Promise<LoanActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportLoanActionFailure("loan_case_create_context_failed", error);
    return { error: UNKNOWN_CREATE_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  let newId: string | undefined;
  try {
    const parsed = createSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Please check the case fields." };
    }
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
    const outcome = await db.transaction(async (tx) => {
      // Serialize all case changes for the same lead so two concurrent writes
      // cannot each recompute from an incomplete view and leave a stale status.
      const [lead] = await tx
        .select({ id: schema.leads.id })
        .from(schema.leads)
        .where(eq(schema.leads.id, d.leadId))
        .limit(1)
        .for("update");
      if (!lead) return { kind: "missing" } as const;
      const [inserted] = await tx
        .insert(schema.loanCases)
        .values(values)
        .returning({ id: schema.loanCases.id });
      if (!inserted) throw new Error("Loan case insert returned no identifier");
      await recomputeLeadStatus(tx, d.leadId);
      await tx.insert(schema.auditLog).values({
        actorId: user.id,
        actorEmail: user.email,
        action: "loan_case.create",
        entityType: "loan_case",
        entityId: inserted.id,
        after: values,
      });
      return { kind: "created", id: inserted.id } as const;
    });
    if (outcome.kind === "missing") {
      return { error: "Lead not found. It may have been removed." };
    }
    newId = outcome.id;
    revalidatePath(`/leads/${d.leadId}`);
    revalidatePath("/loan-cases");
  } catch (error) {
    reportLoanActionFailure("loan_case_create_failed", error);
    return { error: UNKNOWN_CREATE_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
  if (!newId) return { error: UNKNOWN_CREATE_OUTCOME };
  redirect(`/loan-cases/${newId}`);
}

const updateSchema = z.object({
  caseId: z.string().uuid(),
  lenderSlug: z.enum(lenderSlugs),
  productSlug: z.enum(productSlugs),
  status: z.enum(schema.loanCaseStatus.enumValues),
  ...amounts,
});

export async function updateLoanCaseAction(
  _prev: LoanActionResult,
  formData: FormData,
): Promise<LoanActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportLoanActionFailure("loan_case_update_context_failed", error);
    return { error: UNKNOWN_UPDATE_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    const parsed = updateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Please check the case fields." };
    }
    const d = parsed.data;

    const outcome = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.loanCases)
        .where(eq(schema.loanCases.id, d.caseId))
        .limit(1)
        .for("update");
      if (!existing) return { kind: "missing_case" } as const;
      const [lead] = await tx
        .select({ id: schema.leads.id })
        .from(schema.leads)
        .where(eq(schema.leads.id, existing.leadId))
        .limit(1)
        .for("update");
      if (!lead) return { kind: "missing_lead" } as const;
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
      return { kind: "updated", leadId: existing.leadId } as const;
    });

    if (outcome.kind === "missing_case") {
      return { error: "Loan case not found. It may have been removed." };
    }
    if (outcome.kind === "missing_lead") {
      return { error: "The lead for this loan case could not be found." };
    }
    revalidatePath(`/loan-cases/${d.caseId}`);
    revalidatePath(`/leads/${outcome.leadId}`);
    revalidatePath("/loan-cases");
    return { ok: true };
  } catch (error) {
    reportLoanActionFailure("loan_case_update_failed", error);
    return { error: UNKNOWN_UPDATE_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}
