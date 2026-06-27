import { ZodError } from "zod";
import { requireRole, type Role } from "@/lib/auth";
import { db } from "@/lib/db";
import { fieldErrors } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export interface ActionResult<T = unknown> {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
}

/** Enforce a minimum role inside a server action. */
export async function guard(min: Role = "ADMIN") {
  return requireRole(min);
}

export async function logAdminAction(input: {
  actorEmail: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  message?: string;
  meta?: unknown;
}) {
  try {
    await db.adminActionLog.create({
      data: {
        actorEmail: input.actorEmail,
        actorRole: input.actorRole,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        message: input.message,
        meta: input.meta == null ? null : JSON.stringify(input.meta),
      },
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

export function actionOk<T>(data?: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(error: string, fields?: Record<string, string>): ActionResult {
  return { ok: false, error, fieldErrors: fields };
}

/** Convert thrown errors into a uniform ActionResult. */
export function toActionError(err: unknown): ActionResult {
  if (err instanceof ZodError) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(err) };
  }
  const e = err as { code?: string; message?: string };
  if (e?.code === "P2002") return { ok: false, error: "That value is already in use." };
  if (e?.code === "P2025") return { ok: false, error: "Record not found." };
  console.error("Action error:", err);
  return { ok: false, error: e?.message || "Something went wrong." };
}

/** Generate a slug unique against the provided existence check. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || "item";
  let slug = root;
  let n = 1;
  while (await exists(slug)) {
    n += 1;
    slug = `${root}-${n}`;
  }
  return slug;
}
