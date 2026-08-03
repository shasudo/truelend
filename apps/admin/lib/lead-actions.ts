"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { bestLoanCaseOutcome } from "@truelend/reference";
import { getMutationContext, isAdminUser } from "./auth";
import { errorType } from "./error-type";
import { notifyLeadStatusIfWarranted } from "./lead-notifications";
import { scheduleAdminRequestContextCleanup } from "./request-context-cleanup";

export type LeadActionResult = { ok?: boolean; error?: string };

const UNKNOWN_PIPELINE_OUTCOME =
  "We couldn't confirm the pipeline update. Reload this lead before trying again.";
const UNKNOWN_NOTE_OUTCOME =
  "We couldn't confirm the note. Reload this lead before adding it again.";

function reportLeadActionFailure(event: string, error: unknown): void {
  console.error(JSON.stringify({ event, errorType: errorType(error) }));
}

/**
 * Employees work only their own book, so every lead read and write is narrowed
 * to the rows assigned to them. An admin gets `undefined` — no restriction.
 * Folding this into the existing where-clause means a lead that is not theirs
 * is simply not found, which is also the right answer for a guessed id.
 */
function leadScope(user: { id: string; role?: string | null }) {
  return isAdminUser(user) ? undefined : eq(schema.leads.assignedTo, user.id);
}

/*
 * Form-action mutations. Each owns the request, writes, and closes its
 * connection via ctx.waitUntil. Auth is getMutationContext, which yields a
 * user only for staff — a non-staff session reads as `user: null` and is
 * denied below, same as an expired one.
 */
const pipelineSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(schema.leadStatus.enumValues),
  // "" means unassign; absent means leave the assignee alone. The employee form
  // omits the control entirely, because only an admin may change it.
  assignedTo: z.string().optional(),
});

// Status + assignee update in one write — the Pipeline card is a single form,
// so saving one control must not discard an unsaved change to the other.
export async function updateLeadPipelineAction(
  _prev: LeadActionResult,
  formData: FormData,
): Promise<LeadActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportLeadActionFailure("lead_pipeline_context_failed", error);
    return { error: UNKNOWN_PIPELINE_OUTCOME };
  }
  const { db, ctx, env, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    const parsed = pipelineSchema.safeParse({
      leadId: formData.get("leadId"),
      status: formData.get("status"),
      // An absent control posts nothing; `null` would fail the optional string.
      assignedTo: formData.get("assignedTo") ?? undefined,
    });
    if (!parsed.success) return { error: "Invalid pipeline update." };
    const requestedAssignee = parsed.data.assignedTo;
    // This form saves status and assignee together, so it is submitted with an
    // unchanged status whenever someone is reassigned. Notifying on that would
    // re-send a stage email the applicant already had.
    let previousStatus: string | undefined;
    const outcome = await db.transaction(async (tx) => {
      const [lead] = await tx
        .select({ status: schema.leads.status, assignedTo: schema.leads.assignedTo })
        .from(schema.leads)
        .where(and(eq(schema.leads.id, parsed.data.leadId), leadScope(user)))
        .limit(1)
        .for("update");
      if (!lead) return "missing" as const;
      previousStatus = lead.status;
      const assignedTo =
        requestedAssignee === undefined
          ? lead.assignedTo
          : requestedAssignee.length > 0
            ? requestedAssignee
            : null;
      // Refuses the change, not the field: an admin-authored form that echoes
      // the current assignee is a no-op either way.
      if (assignedTo !== lead.assignedTo && !isAdminUser(user)) {
        return "assign_forbidden" as const;
      }
      // Only a *changed* assignee is validated. Re-checking an unchanged one
      // would block every status update on a lead whose assignee was since
      // banned — the person saving is not the one who needs replacing.
      if (assignedTo && assignedTo !== lead.assignedTo) {
        const [staff] = await tx
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(
            and(
              eq(schema.user.id, assignedTo),
              inArray(schema.user.role, ["admin", "employee"]),
              or(isNull(schema.user.banned), eq(schema.user.banned, false)),
            ),
          )
          .limit(1);
        if (!staff) return "invalid_assignee" as const;
      }
      const cases = await tx
        .select({ status: schema.loanCases.status })
        .from(schema.loanCases)
        .where(eq(schema.loanCases.leadId, parsed.data.leadId));
      const caseOutcome = bestLoanCaseOutcome(cases.map((loanCase) => loanCase.status));
      if (caseOutcome && parsed.data.status !== caseOutcome) {
        return "case_conflict" as const;
      }
      await tx
        .update(schema.leads)
        .set({ status: parsed.data.status, assignedTo })
        .where(eq(schema.leads.id, parsed.data.leadId));
      await tx.insert(schema.auditLog).values({
        actorId: user.id,
        actorEmail: user.email,
        action: "lead.pipeline_update",
        entityType: "lead",
        entityId: parsed.data.leadId,
        before: lead,
        after: { status: parsed.data.status, assignedTo },
      });
      return "updated" as const;
    });
    if (outcome === "missing") return { error: "Lead not found. It may have been removed." };
    if (outcome === "assign_forbidden") {
      return { error: "Only an admin can change who a lead is assigned to." };
    }
    if (outcome === "invalid_assignee") {
      return { error: "The selected assignee is no longer available." };
    }
    if (outcome === "case_conflict") {
      return {
        error:
          "This lead's status is controlled by its loan case outcomes. Update the loan case instead.",
      };
    }
    // Guarded so an unchanged status, or an ordinary internal stage move, costs
    // no extra reads and sends nothing.
    if (previousStatus !== parsed.data.status) {
      await notifyLeadStatusIfWarranted(db, ctx, env, parsed.data.leadId, parsed.data.status);
    }
    revalidatePath(`/leads/${parsed.data.leadId}`);
    revalidatePath("/leads");
    return { ok: true };
  } catch (error) {
    reportLeadActionFailure("lead_pipeline_update_failed", error);
    return { error: UNKNOWN_PIPELINE_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}

const noteSchema = z.object({
  leadId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export async function addLeadNoteAction(
  _prev: LeadActionResult,
  formData: FormData,
): Promise<LeadActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportLeadActionFailure("lead_note_context_failed", error);
    return { error: UNKNOWN_NOTE_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    const parsed = noteSchema.safeParse({
      leadId: formData.get("leadId"),
      body: formData.get("body"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Enter a note." };
    }
    const added = await db.transaction(async (tx) => {
      const [lead] = await tx
        .select({ id: schema.leads.id })
        .from(schema.leads)
        .where(and(eq(schema.leads.id, parsed.data.leadId), leadScope(user)))
        .limit(1)
        .for("update");
      if (!lead) return false;
      const [note] = await tx
        .insert(schema.leadNotes)
        .values({
          leadId: parsed.data.leadId,
          authorId: user.id,
          body: parsed.data.body,
        })
        .returning({ id: schema.leadNotes.id });
      await tx.insert(schema.auditLog).values({
        actorId: user.id,
        actorEmail: user.email,
        action: "lead.note_add",
        entityType: "lead_note",
        entityId: note?.id,
        after: { leadId: parsed.data.leadId },
      });
      return true;
    });
    if (!added) return { error: "Lead not found. It may have been removed." };
    revalidatePath(`/leads/${parsed.data.leadId}`);
    return { ok: true };
  } catch (error) {
    reportLeadActionFailure("lead_note_add_failed", error);
    return { error: UNKNOWN_NOTE_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}
