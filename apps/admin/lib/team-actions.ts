"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
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

export type CreateUserState = {
  ok?: boolean;
  error?: string;
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

export async function setRoleAction(formData: FormData) {
  const { auth, db, ctx, h, me } = await adminContext();
  if (me?.role !== "admin") redirect("/login");
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  // Don't let an admin demote themselves and risk locking everyone out.
  if (parsed.data.userId === me.id && parsed.data.role !== "admin") return;
  try {
    await auth.api.setRole({
      body: { userId: parsed.data.userId, role: asRole(parsed.data.role) },
      headers: h,
    });
    revalidatePath("/team");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}

const banSchema = z.object({
  userId: z.string().min(1),
  currentlyBanned: z.enum(["true", "false"]),
});

export async function toggleBanAction(formData: FormData) {
  const { auth, db, ctx, h, me } = await adminContext();
  if (me?.role !== "admin") redirect("/login");
  const parsed = banSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  if (parsed.data.userId === me.id) return; // never ban yourself
  try {
    if (parsed.data.currentlyBanned === "true") {
      await auth.api.unbanUser({ body: { userId: parsed.data.userId }, headers: h });
    } else {
      await auth.api.banUser({ body: { userId: parsed.data.userId }, headers: h });
    }
    revalidatePath("/team");
  } finally {
    ctx.waitUntil(db.$client.end());
  }
}
