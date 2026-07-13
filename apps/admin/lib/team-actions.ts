"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@truelend/db";
import { getAuthContext } from "./auth";

const ROLES = ["admin", "employee"] as const;

// better-auth's admin plugin types roles as "user" | "admin"; TrueLend stores
// custom string roles (employee now; partner/referral later) as plain text.
// Cast at the API boundary — the value is stored verbatim at runtime.
const asRole = (r: string): "admin" => r as "admin";

async function adminContext() {
  const { auth, db, ctx } = getAuthContext();
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  return { auth, db, ctx, h, me: session?.user ?? null };
}

/** Result surfaced back to the client so every action shows success/failure. */
export type ActionResult = { ok?: boolean; error?: string };

export type CreateUserState = ActionResult & {
  // Returned on success so the admin can copy the credentials to share — the
  // temp password isn't stored anywhere retrievable afterward.
  createdEmail?: string;
  tempPassword?: string;
};

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ROLES),
});

export async function createUserAction(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const { auth, db, ctx, h, me } = await adminContext();
  if (me?.role !== "admin") return { error: "Not authorized" };

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
  }
  try {
    await auth.api.createUser({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        role: asRole(parsed.data.role),
      },
      headers: h,
    });
    revalidatePath("/team");
    return { ok: true, createdEmail: parsed.data.email, tempPassword: parsed.data.password };
  } catch (err) {
    return { error: (err as Error).message || "Could not create user (email may already exist)." };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

const roleSchema = z.object({ userId: z.string().min(1), role: z.enum(ROLES) });

export async function setRoleAction(formData: FormData): Promise<ActionResult> {
  const { auth, db, ctx, h, me } = await adminContext();
  if (me?.role !== "admin") return { error: "Not authorized." };
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  // Don't let an admin demote themselves and risk locking everyone out.
  if (parsed.data.userId === me.id && parsed.data.role !== "admin")
    return { error: "You can't remove your own admin access." };
  try {
    await auth.api.setRole({
      body: { userId: parsed.data.userId, role: asRole(parsed.data.role) },
      headers: h,
    });
    revalidatePath("/team");
    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message || "Couldn't update the role." };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

const banSchema = z.object({
  userId: z.string().min(1),
  currentlyBanned: z.enum(["true", "false"]),
});

export async function toggleBanAction(formData: FormData): Promise<ActionResult> {
  const { auth, db, ctx, h, me } = await adminContext();
  if (me?.role !== "admin") return { error: "Not authorized." };
  const parsed = banSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  if (parsed.data.userId === me.id) return { error: "You can't ban your own account." };
  try {
    if (parsed.data.currentlyBanned === "true") {
      await auth.api.unbanUser({ body: { userId: parsed.data.userId }, headers: h });
    } else {
      await auth.api.banUser({ body: { userId: parsed.data.userId }, headers: h });
    }
    revalidatePath("/team");
    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message || "Couldn't update access." };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

const removeSchema = z.object({ userId: z.string().min(1) });

export async function removeUserAction(formData: FormData): Promise<ActionResult> {
  const { auth, db, ctx, h, me } = await adminContext();
  if (me?.role !== "admin") return { error: "Not authorized." };
  const parsed = removeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };
  if (parsed.data.userId === me.id) return { error: "You can't delete your own account." };
  try {
    // lead_notes.author_id and loan_cases.created_by are NOT NULL with no
    // cascade — hard-deleting a user with either would violate the FK (and lose
    // audit history). Refuse and steer to ban instead.
    const [notes, cases] = await Promise.all([
      db
        .select({ id: schema.leadNotes.id })
        .from(schema.leadNotes)
        .where(eq(schema.leadNotes.authorId, parsed.data.userId))
        .limit(1),
      db
        .select({ id: schema.loanCases.id })
        .from(schema.loanCases)
        .where(eq(schema.loanCases.createdBy, parsed.data.userId))
        .limit(1),
    ]);
    if (notes.length || cases.length) {
      return {
        error:
          "This teammate has notes or loan cases on record, so they can't be deleted without losing that history. Ban them instead.",
      };
    }
    await auth.api.removeUser({ body: { userId: parsed.data.userId }, headers: h });
    revalidatePath("/team");
    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message || "Couldn't delete this user." };
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
