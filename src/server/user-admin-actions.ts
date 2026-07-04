"use server";

import { z } from "zod";
import { requireOwner, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPermissionKey } from "@/lib/permissions";
import { actionOk, toActionError, logAdminAction, type ActionResult } from "./_helpers";

const WORKER_ROLES = ["ADMIN", "BARBER"] as const;

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[a-zA-Z]/, "Include a letter")
    .regex(/[0-9]/, "Include a number"),
  role: z.enum(WORKER_ROLES),
  staffId: z.string().nullable().optional(),
  permissions: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  role: z.enum(WORKER_ROLES),
  isActive: z.boolean(),
  staffId: z.string().nullable().optional(),
  permissions: z.array(z.string()).default([]),
});

function cleanPermissions(keys: string[]): string[] {
  return [...new Set(keys.filter(isPermissionKey))];
}

/** Owner creates a worker account (email + password) with selected permissions. */
export async function createWorker(raw: unknown): Promise<ActionResult> {
  const owner = await requireOwner();
  try {
    const input = createSchema.parse(raw);
    const existing = await db.user.findUnique({ where: { email: input.email } });
    if (existing) return { ok: false, error: "An account with that email already exists.", fieldErrors: { email: "Already in use" } };

    const staffId = input.staffId || null;
    if (staffId) {
      const clash = await db.user.findFirst({ where: { staffId } });
      if (clash) return { ok: false, error: "That barber profile is already linked to another account." };
    }

    const passwordHash = await hashPassword(input.password);
    const perms = cleanPermissions(input.permissions);
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        staffId,
        permissions: { create: perms.map((key) => ({ key })) },
      },
    });
    await logAdminAction({ actorEmail: owner.email, actorRole: owner.role, action: "create", targetType: "user", targetId: user.id, message: `Created ${input.role} ${input.email}`, meta: { permissions: perms } });
    return actionOk({ id: user.id });
  } catch (err) {
    return toActionError(err);
  }
}

/** Owner updates a worker's role, status, barber link and permission set. */
export async function updateWorker(raw: unknown): Promise<ActionResult> {
  const owner = await requireOwner();
  try {
    const input = updateSchema.parse(raw);
    const target = await db.user.findUnique({ where: { id: input.id } });
    if (!target) return { ok: false, error: "Account not found." };
    if (target.role === "OWNER") return { ok: false, error: "The owner account can't be edited here." };
    if (target.id === owner.sub) return { ok: false, error: "Use My Account to edit your own profile." };

    const staffId = input.staffId || null;
    if (staffId) {
      const clash = await db.user.findFirst({ where: { staffId, id: { not: target.id } } });
      if (clash) return { ok: false, error: "That barber profile is already linked to another account." };
    }

    const perms = cleanPermissions(input.permissions);
    await db.$transaction([
      db.user.update({ where: { id: target.id }, data: { name: input.name, role: input.role, isActive: input.isActive, staffId } }),
      db.userPermission.deleteMany({ where: { userId: target.id } }),
      ...(perms.length ? [db.userPermission.createMany({ data: perms.map((key) => ({ userId: target.id, key })) })] : []),
    ]);
    await logAdminAction({ actorEmail: owner.email, actorRole: owner.role, action: "update", targetType: "user", targetId: target.id, message: `Updated ${target.email}`, meta: { permissions: perms } });
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

/** Owner sets a new password for a worker. */
export async function resetWorkerPassword(id: string, newPassword: string): Promise<ActionResult> {
  const owner = await requireOwner();
  try {
    const pw = z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[a-zA-Z]/, "Include a letter")
      .regex(/[0-9]/, "Include a number")
      .parse(newPassword);
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return { ok: false, error: "Account not found." };
    if (target.role === "OWNER" && target.id !== owner.sub) return { ok: false, error: "You can't reset another owner's password." };
    await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(pw), failedLoginCount: 0, lockedUntil: null } });
    await logAdminAction({ actorEmail: owner.email, actorRole: owner.role, action: "update", targetType: "user", targetId: id, message: `Reset password for ${target.email}` });
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

/** Owner removes a worker account. */
export async function deleteWorker(id: string): Promise<ActionResult> {
  const owner = await requireOwner();
  try {
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return { ok: false, error: "Account not found." };
    if (target.role === "OWNER") return { ok: false, error: "The owner account can't be removed." };
    if (target.id === owner.sub) return { ok: false, error: "You can't remove your own account." };
    await db.user.delete({ where: { id } }); // cascades UserPermission
    await logAdminAction({ actorEmail: owner.email, actorRole: owner.role, action: "delete", targetType: "user", targetId: id, message: `Removed ${target.email}` });
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}
