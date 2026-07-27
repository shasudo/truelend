"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { bestLoanCaseOutcome } from "@truelend/reference";
import { getMutationContext } from "./auth";
import { scheduleAdminRequestContextCleanup } from "./request-context-cleanup";

export type LeadActionState = { ok?: boolean; error?: string };

const UNKNOWN_PIPELINE_OUTCOME =
  "We couldn't confirm the pipeline update. Reload this lead before trying again.";
const UNKNOWN_NOTE_OUTCOME =
  "We couldn't confirm the note. Reload this lead before adding it again.";

function reportLeadActionFailure(event: string, error: unknown): void {
  console.error(
    JSON.stringify({
      event,
      errorType: error instanceof Error ? error.name : "unknown",
    }),
  );
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
  // "" means unassign
  assignedTo: z.string().optional(),
});

// Status + assignee update in one write — the Pipeline card is a single form,
// so saving one control must not discard an unsaved change to the other.
export async function updateLeadPipelineAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportLeadActionFailure("lead_pipeline_context_failed", error);
    return { error: UNKNOWN_PIPELINE_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    const parsed = pipelineSchema.safeParse({
      leadId: formData.get("leadId"),
      status: formData.get("status"),
      assignedTo: formData.get("assignedTo"),
    });
    if (!parsed.success) return { error: "Invalid pipeline update." };
    const assignedTo =
      parsed.data.assignedTo && parsed.data.assignedTo.length > 0 ? parsed.data.assignedTo : null;
    const outcome = await db.transaction(async (tx) => {
      const [lead] = await tx
        .select({ status: schema.leads.status, assignedTo: schema.leads.assignedTo })
        .from(schema.leads)
        .where(eq(schema.leads.id, parsed.data.leadId))
        .limit(1)
        .for("update");
      if (!lead) return "missing" as const;
      if (assignedTo) {
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
    if (outcome === "invalid_assignee") {
      return { error: "The selected assignee is no longer available." };
    }
    if (outcome === "case_conflict") {
      return {
        error:
          "This lead's status is controlled by its loan case outcomes. Update the loan case instead.",
      };
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
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
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
        .where(eq(schema.leads.id, parsed.data.leadId))
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
