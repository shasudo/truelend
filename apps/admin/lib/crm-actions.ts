"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { sendEnquiryFormLink } from "@truelend/email";
import {
  appUrls,
  customerConsentVersion,
  employeeCallStatusValues,
  isTerminalCallStatus,
  normalizeIndianMobile,
  productSlugs,
  rupeesToPaise,
  validationMessages,
  validationPatterns,
} from "@truelend/reference";
import { type ActionResult } from "./action-result";
import { getMutationContext, isAdminUser } from "./auth";
import { errorType } from "./error-type";
import { scheduleAdminRequestContextCleanup } from "./request-context-cleanup";

const UNKNOWN_STATUS_OUTCOME =
  "We couldn't confirm the call outcome. Reload this task before trying again.";
const UNKNOWN_ASSIGN_OUTCOME =
  "We couldn't confirm the assignment. Reload the call queue before trying again.";
const UNKNOWN_CONVERT_OUTCOME =
  "We couldn't confirm the conversion. Reload this task before trying again — it may already have a lead.";
const UNKNOWN_EMAIL_OUTCOME = "We couldn't confirm the send. Check the task before trying again.";

function reportCrmActionFailure(event: string, error: unknown): void {
  console.error(JSON.stringify({ event, errorType: errorType(error) }));
}

/**
 * Employees work only their own queue. Admins get `undefined` — no restriction.
 * Folded into the where-clause so a task that is not theirs is simply not
 * found, which is also the right answer for a guessed id.
 */
function taskScope(user: { id: string; role?: string | null }) {
  return isAdminUser(user) ? undefined : eq(schema.callTasks.assignedTo, user.id);
}

/* ---- assignment (admin only) ---- */

const assignSchema = z.object({
  // Bulk, because assigning a freshly imported list one row at a time is the
  // actual job. The cap bounds one statement's parameter count.
  taskIds: z.array(z.string().uuid()).min(1).max(200),
  // "" means unassign.
  assignedTo: z.string().optional(),
});

export async function assignCallTasksAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportCrmActionFailure("crm_assign_context_failed", error);
    return { error: UNKNOWN_ASSIGN_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    if (!isAdminUser(user)) return { error: "Not authorized." };
    const parsed = assignSchema.safeParse({
      taskIds: formData.getAll("taskIds").map(String),
      assignedTo: formData.get("assignedTo") ?? undefined,
    });
    if (!parsed.success) return { error: "Select at least one call task to assign." };
    const assignedTo =
      parsed.data.assignedTo && parsed.data.assignedTo.length > 0 ? parsed.data.assignedTo : null;

    const outcome = await db.transaction(async (tx) => {
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
      await tx
        .update(schema.callTasks)
        .set({ assignedTo })
        .where(inArray(schema.callTasks.id, parsed.data.taskIds));
      await tx.insert(schema.auditLog).values({
        actorId: user.id,
        actorEmail: user.email,
        action: "call_task.assign",
        entityType: "call_task",
        // A bulk action has no single entity; the count and target carry it.
        entityId: null,
        after: { count: parsed.data.taskIds.length, assignedTo },
      });
      return "assigned" as const;
    });
    if (outcome === "invalid_assignee") {
      return { error: "The selected assignee is no longer available." };
    }
    revalidatePath("/crm");
    return { ok: true };
  } catch (error) {
    reportCrmActionFailure("crm_assign_failed", error);
    return { error: UNKNOWN_ASSIGN_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}

/* ---- call outcome ---- */

const statusSchema = z
  .object({
    taskId: z.string().uuid(),
    // `converted` is deliberately not in this enum: only the conversion action
    // writes it, and only once a lead row exists.
    status: z.enum(employeeCallStatusValues),
    callbackAt: z.string().trim().optional(),
    note: z.string().trim().max(4000).optional(),
  })
  .refine((v) => v.status !== "callback_scheduled" || Boolean(v.callbackAt), {
    message: "Pick a callback date and time.",
    path: ["callbackAt"],
  });

export async function updateCallTaskStatusAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportCrmActionFailure("crm_status_context_failed", error);
    return { error: UNKNOWN_STATUS_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    const parsed = statusSchema.safeParse({
      taskId: formData.get("taskId"),
      status: formData.get("status"),
      callbackAt: formData.get("callbackAt") ?? undefined,
      note: formData.get("note") ?? undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid call outcome." };
    }
    /*
     * A datetime-local value carries no zone, and a Worker runs in UTC — so a
     * bare `new Date("2026-08-05T14:30")` would store 14:30 UTC for a caller who
     * meant 14:30 IST, and every callback would come due 5.5 hours late. Pin the
     * offset explicitly so the stored instant is right in dev and in production.
     * ponytail: IST is hardcoded because the whole product is India-only (rupees,
     * Indian mobile validation, en-IN formatting). Take the offset from the
     * client if staff ever work from another zone.
     */
    const callbackAt =
      parsed.data.status === "callback_scheduled" && parsed.data.callbackAt
        ? new Date(`${parsed.data.callbackAt}+05:30`)
        : null;
    if (callbackAt && Number.isNaN(callbackAt.getTime())) {
      return { error: "Pick a callback date and time." };
    }

    const outcome = await db.transaction(async (tx) => {
      const [task] = await tx
        .select({ status: schema.callTasks.status, callbackAt: schema.callTasks.callbackAt })
        .from(schema.callTasks)
        .where(and(eq(schema.callTasks.id, parsed.data.taskId), taskScope(user)))
        .limit(1)
        .for("update");
      // Not found and not yours deliberately return the same outcome.
      if (!task) return "missing" as const;
      if (task.status === "converted") return "converted" as const;

      await tx
        .update(schema.callTasks)
        .set({ status: parsed.data.status, callbackAt })
        .where(eq(schema.callTasks.id, parsed.data.taskId));
      await tx.insert(schema.auditLog).values({
        actorId: user.id,
        actorEmail: user.email,
        action: "call_task.status_update",
        entityType: "call_task",
        entityId: parsed.data.taskId,
        before: { status: task.status, callbackAt: task.callbackAt },
        // The caller's note rides the outcome that produced it, which is why
        // there is no separate notes table.
        after: { status: parsed.data.status, callbackAt, note: parsed.data.note },
      });
      return "updated" as const;
    });
    if (outcome === "missing") return { error: "Call task not found." };
    if (outcome === "converted") {
      return { error: "This task already became a lead. Work it from the lead instead." };
    }
    revalidatePath(`/crm/${parsed.data.taskId}`);
    revalidatePath("/crm");
    return { ok: true };
  } catch (error) {
    reportCrmActionFailure("crm_status_update_failed", error);
    return { error: UNKNOWN_STATUS_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}

/* ---- conversion ---- */

const convertSchema = z.object({
  taskId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .transform(normalizeIndianMobile)
    .refine((v) => validationPatterns.indianMobile.test(v), validationMessages.indianMobile),
  email: z.string().trim().max(254).email().optional().or(z.literal("")),
  city: z.string().trim().max(80).optional(),
  productSlug: z.enum(productSlugs).optional().or(z.literal("")),
  loanAmount: z.string().trim().max(24).optional(),
  message: z.string().trim().max(2000).optional(),
  // The caller attests that the prospect agreed on the call. Without it the
  // lead would have to be written consent:false, which satisfies the database
  // but leaves a row nobody is allowed to contact.
  consent: z.literal("on", { message: "Confirm the prospect consented on the call." }),
});

const blank = (value: string | undefined) => (value && value.length > 0 ? value : null);

export async function convertCallTaskAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportCrmActionFailure("crm_convert_context_failed", error);
    return { error: UNKNOWN_CONVERT_OUTCOME };
  }
  const { db, ctx, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    const parsed = convertSchema.safeParse({
      taskId: formData.get("taskId"),
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email") ?? undefined,
      city: formData.get("city") ?? undefined,
      productSlug: formData.get("productSlug") ?? undefined,
      loanAmount: formData.get("loanAmount") ?? undefined,
      message: formData.get("message") ?? undefined,
      consent: formData.get("consent") ?? undefined,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Check the highlighted fields." };
    }
    const d = parsed.data;

    let convertedLeadId: string | undefined;
    const outcome = await db.transaction(async (tx) => {
      const [task] = await tx
        .select({
          id: schema.callTasks.id,
          status: schema.callTasks.status,
          // The number we actually dialled. The link lookup below must key on
          // this, never on the submitted field — see the comment there.
          phone: schema.callTasks.phone,
          leadId: schema.callTasks.leadId,
          assignedTo: schema.callTasks.assignedTo,
        })
        .from(schema.callTasks)
        .where(and(eq(schema.callTasks.id, d.taskId), taskScope(user)))
        .limit(1)
        .for("update");
      if (!task) return "missing" as const;
      if (task.leadId) return "already_converted" as const;
      if (isTerminalCallStatus(task.status)) return "terminal" as const;

      /*
       * The prospect may have filled the public form themselves after the call,
       * in which case the website worker already made the lead. Link that row
       * rather than minting a second one for the same person.
       *
       * Keyed on the task's stored phone, NOT the submitted one: the form field
       * is editable, and keying on it would let a caller point their task at any
       * lead in the system by typing that number — writing a note into a lead
       * they cannot read, and leaving the real prospect without a lead. The
       * submitted phone only ever populates a newly created row.
       */
      const [existing] = await tx
        .select({
          id: schema.leads.id,
          name: schema.leads.name,
          email: schema.leads.email,
          city: schema.leads.city,
          productSlug: schema.leads.productSlug,
          loanAmountPaise: schema.leads.loanAmountPaise,
          assignedTo: schema.leads.assignedTo,
        })
        .from(schema.leads)
        .where(eq(schema.leads.phone, task.phone))
        .orderBy(desc(schema.leads.createdAt))
        .limit(1);

      let leadId = existing?.id;
      const linkedExisting = Boolean(leadId);

      if (!leadId) {
        const [lead] = await tx
          .insert(schema.leads)
          .values({
            // `enquiry` needs name + phone, which convertSchema guarantees, so
            // leads_required_fields holds. A dedicated kind would break four
            // exhaustive maps for no gain.
            kind: "enquiry",
            name: d.name,
            phone: d.phone,
            email: blank(d.email),
            city: blank(d.city),
            productSlug: blank(d.productSlug),
            message: blank(d.message),
            loanAmountPaise: rupeesToPaise(d.loanAmount),
            status: "new",
            // A creation default, not an assignment control: the caller keeps
            // the person they just spoke to. Only an admin can move it after.
            assignedTo: task.assignedTo ?? user.id,
            // All three proof columns together, or leads_consent_proof rejects it.
            consent: true,
            consentAt: new Date(),
            consentSource: "crm_call",
            consentVersion: customerConsentVersion,
          })
          .returning({ id: schema.leads.id });
        if (!lead) throw new Error("Lead insert returned no identifier");
        leadId = lead.id;
      } else if (existing) {
        /*
         * Fill only the gaps. The existing row is usually the prospect's own
         * form submission, which is richer than a CSV-seeded task, so its
         * values win; but anything it left empty should still receive what the
         * caller just captured rather than being silently dropped on the floor.
         */
        const filled = {
          ...(existing.name === null && { name: d.name }),
          ...(existing.email === null && blank(d.email) !== null && { email: blank(d.email) }),
          ...(existing.city === null && blank(d.city) !== null && { city: blank(d.city) }),
          ...(existing.productSlug === null &&
            blank(d.productSlug) !== null && { productSlug: blank(d.productSlug) }),
          ...(existing.loanAmountPaise === null &&
            rupeesToPaise(d.loanAmount) !== null && {
              loanAmountPaise: rupeesToPaise(d.loanAmount),
            }),
          // An unassigned website lead becomes the caller's; an already-assigned
          // one keeps its owner, since only an admin may reassign.
          ...(existing.assignedTo === null && { assignedTo: task.assignedTo ?? user.id }),
        };
        if (Object.keys(filled).length > 0) {
          await tx.update(schema.leads).set(filled).where(eq(schema.leads.id, leadId));
        }
      }

      await tx
        .update(schema.callTasks)
        .set({ status: "converted", leadId })
        .where(eq(schema.callTasks.id, d.taskId));

      await tx.insert(schema.leadNotes).values({
        leadId,
        authorId: user.id,
        body: d.message
          ? `Converted from the call queue.\n\n${d.message}`
          : "Converted from the call queue.",
      });

      await tx.insert(schema.auditLog).values({
        actorId: user.id,
        actorEmail: user.email,
        action: "call_task.convert",
        entityType: "call_task",
        entityId: d.taskId,
        before: { status: task.status },
        after: { leadId, linkedExisting },
      });
      if (!linkedExisting) {
        // Same action string the public forms write, so getLead's existing
        // attribution read finds a row instead of nothing.
        await tx.insert(schema.auditLog).values({
          actorId: user.id,
          actorEmail: user.email,
          action: "lead.create",
          entityType: "lead",
          entityId: leadId,
          after: {
            source: "crm_call",
            kind: "enquiry",
            callTaskId: d.taskId,
            consentVersion: customerConsentVersion,
          },
        });
      }
      convertedLeadId = leadId;
      return linkedExisting ? ("linked" as const) : ("created" as const);
    });

    if (outcome === "missing") return { error: "Call task not found." };
    if (outcome === "already_converted") {
      return { error: "This task already has a lead." };
    }
    if (outcome === "terminal") {
      return { error: "This task is closed. Reopen the outcome before converting it." };
    }
    revalidatePath(`/crm/${d.taskId}`);
    revalidatePath("/crm");
    revalidatePath("/leads");
    if (convertedLeadId) revalidatePath(`/leads/${convertedLeadId}`);
    return outcome === "linked"
      ? {
          ok: true,
          notice:
            "A lead already existed for this number, so the task was linked to it. Its existing details were kept; only blank fields were filled in.",
        }
      : { ok: true };
  } catch (error) {
    reportCrmActionFailure("crm_convert_failed", error);
    return { error: UNKNOWN_CONVERT_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}

/* ---- send the prospect the public form ---- */

const emailSchema = z.object({ taskId: z.string().uuid() });

/** Collapses double-clicks and retries without blocking a genuine later resend. */
const RESEND_WINDOW_MS = 5 * 60 * 1000;

export async function emailEnquiryFormAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  let context: Awaited<ReturnType<typeof getMutationContext>>;
  try {
    context = await getMutationContext();
  } catch (error) {
    reportCrmActionFailure("crm_form_email_context_failed", error);
    return { error: UNKNOWN_EMAIL_OUTCOME };
  }
  const { db, ctx, env, user } = context;
  if (!user) {
    scheduleAdminRequestContextCleanup({ db, ctx });
    redirect("/login");
  }

  try {
    const parsed = emailSchema.safeParse({ taskId: formData.get("taskId") });
    if (!parsed.success) return { error: "Call task not found." };

    const [task] = await db
      .select({
        name: schema.callTasks.name,
        email: schema.callTasks.email,
        productSlug: schema.callTasks.productSlug,
      })
      .from(schema.callTasks)
      .where(and(eq(schema.callTasks.id, parsed.data.taskId), taskScope(user)))
      .limit(1);
    if (!task) return { error: "Call task not found." };
    if (!task.email) {
      return { error: "This prospect has no email address. Copy the link and send it instead." };
    }

    // A distinct key prefix on the shared auth limiter — the same trick the KYC
    // upload uses — so no new rate-limit namespace or binding is needed.
    const allowed = await env.AUTH_RATE_LIMITER.limit({ key: `crm-form-email:${user.id}` });
    if (!allowed.success) return { error: "Too many emails. Please wait a minute." };

    const url = `${appUrls.website}/enquiry${task.productSlug ? `?product=${encodeURIComponent(task.productSlug)}` : ""}`;
    // Awaited, not backgrounded: sending the link IS the operator's intent
    // here, so a failure has to reach them rather than becoming a log line.
    const result = await sendEnquiryFormLink(env, {
      to: task.email,
      name: task.name,
      url,
      idempotencyKey: `enquiry_form_link:${parsed.data.taskId}:${Math.floor(Date.now() / RESEND_WINDOW_MS)}`,
    });
    if (!result.ok) {
      console.error(
        JSON.stringify({ event: "crm_form_email_rejected", status: result.status ?? null }),
      );
      return { error: "We couldn't send the form link. Try again, or copy the link instead." };
    }

    // A lone statement with no paired mutation, so it is not a transaction: a
    // tx here would wrap one insert and prove nothing.
    await db.insert(schema.auditLog).values({
      actorId: user.id,
      actorEmail: user.email,
      action: "call_task.form_emailed",
      entityType: "call_task",
      entityId: parsed.data.taskId,
      after: { sent: true, skipped: result.skipped ?? false },
    });
    revalidatePath(`/crm/${parsed.data.taskId}`);
    return result.skipped
      ? { ok: true, notice: "Email is not configured here, so nothing was actually sent." }
      : { ok: true };
  } catch (error) {
    reportCrmActionFailure("crm_form_email_failed", error);
    return { error: UNKNOWN_EMAIL_OUTCOME };
  } finally {
    scheduleAdminRequestContextCleanup({ db, ctx });
  }
}
