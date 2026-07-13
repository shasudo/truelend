"use server";

import { revalidatePath } from "next/cache";
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

const statusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(schema.leadStatus.enumValues),
});

export async function updateLeadStatusAction(formData: FormData) {
  const { db, ctx, user } = await session();
  if (!user) return;
  const parsed = statusSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;
  try {
    await db
      .update(schema.leads)
      .set({ status: parsed.data.status })
      .where(eq(schema.leads.id, parsed.data.leadId));
    revalidatePath(`/leads/${parsed.data.leadId}`);
    revalidatePath("/leads");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

const assignSchema = z.object({
  leadId: z.string().uuid(),
  // "" means unassign
  assignedTo: z.string().optional(),
});

export async function assignLeadAction(formData: FormData) {
  const { db, ctx, user } = await session();
  if (!user) return;
  const parsed = assignSchema.safeParse({
    leadId: formData.get("leadId"),
    assignedTo: formData.get("assignedTo"),
  });
  if (!parsed.success) return;
  const assignedTo =
    parsed.data.assignedTo && parsed.data.assignedTo.length > 0 ? parsed.data.assignedTo : null;
  try {
    await db
      .update(schema.leads)
      .set({ assignedTo })
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
  if (!user) return;
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
