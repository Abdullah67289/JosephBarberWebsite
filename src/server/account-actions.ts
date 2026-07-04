"use server";

import { z } from "zod";
import { requireAuth, verifyPassword, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { actionOk, toActionError, logAdminAction, type ActionResult } from "./_helpers";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[a-zA-Z]/, "Include a letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Update the signed-in user's own name/email. */
export async function updateOwnProfile(raw: unknown): Promise<ActionResult> {
  const session = await requireAuth();
  if (session.isDevBypass) return { ok: false, error: "The demo bypass account can't be edited." };
  try {
    const { name, email } = profileSchema.parse(raw);
    const clash = await db.user.findFirst({ where: { email, id: { not: session.sub } } });
    if (clash) return { ok: false, error: "That email is already in use.", fieldErrors: { email: "Already in use" } };
    await db.user.update({ where: { id: session.sub }, data: { name, email } });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: "update", targetType: "account", targetId: session.sub, message: "Updated own profile" });
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

/** Change the signed-in user's own password (requires the current one). */
export async function changeOwnPassword(raw: unknown): Promise<ActionResult> {
  const session = await requireAuth();
  if (session.isDevBypass) return { ok: false, error: "The demo bypass account has no password." };
  try {
    const { currentPassword, newPassword } = passwordSchema.parse(raw);
    const user = await db.user.findUnique({ where: { id: session.sub } });
    if (!user) return { ok: false, error: "Account not found." };
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) return { ok: false, error: "Current password is incorrect.", fieldErrors: { currentPassword: "Incorrect" } };
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword), failedLoginCount: 0, lockedUntil: null },
    });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: "update", targetType: "account", targetId: user.id, message: "Changed own password" });
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}
