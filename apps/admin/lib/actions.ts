"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { getAuthContext } from "./auth";

/*
 * Form-action mutations. Each owns the request, so it validates the session,
 * writes, and closes its connection via ctx.waitUntil (getAuthContext is
 * React.cache'd per request — here that request is the action's own POST).
 */
async function session() {
  const { db, auth, ctx } = getAuthContext();
  const s = await auth.api.getSession({ headers: await headers() });
  return { db, ctx, user: s?.user ?? null };
}

const pipelineSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(schema.leadStatus.enumValues),
  // "" means unassign
  assignedTo: z.string().optional(),
});

// Status + assignee update in one write — the Pipeline card is a single form,
// so saving one control must not discard an unsaved change to the other.
export async function updateLeadPipelineAction(formData: FormData) {
  const { db, ctx, user } = await session();
  if (!user) redirect("/login"); // expired session → explain, don't eat the click
  const parsed = pipelineSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
    assignedTo: formData.get("assignedTo"),
  });
  if (!parsed.success) return;
  const assignedTo =
    parsed.data.assignedTo && parsed.data.assignedTo.length > 0 ? parsed.data.assignedTo : null;
  try {
    await db
      .update(schema.leads)
      .set({ status: parsed.data.status, assignedTo })
      .where(eq(schema.leads.id, parsed.data.leadId));
    revalidatePath(`/leads/${parsed.data.leadId}`);
    revalidatePath("/leads");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

const noteSchema = z.object({
  leadId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export async function addLeadNoteAction(formData: FormData) {
  const { db, ctx, user } = await session();
  if (!user) redirect("/login"); // expired session → explain, don't eat the click
  const parsed = noteSchema.safeParse({
    leadId: formData.get("leadId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;
  try {
    await db.insert(schema.leadNotes).values({
      leadId: parsed.data.leadId,
      authorId: user.id,
      body: parsed.data.body,
    });
    revalidatePath(`/leads/${parsed.data.leadId}`);
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
