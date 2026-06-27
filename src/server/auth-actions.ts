"use server";

import { redirect } from "next/navigation";
import { loginSchema, signupSchema } from "@/lib/validation";
import {
  authenticate,
  createDevBypassSession,
  createSession,
  destroySession,
  hashPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { adminEmailAllowed, isAdminSignupAllowed } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { clientIp } from "@/lib/rate-limit";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 10, 60_000).success) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Please enter a valid email and password." };

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return { error: "Invalid email or password." };

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    staffId: user.staffId,
  });

  const next = String(formData.get("next") || "/admin");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function devBypassLoginAction(formData: FormData) {
  const ok = await createDevBypassSession();
  if (!ok) redirect("/admin/login?error=dev-bypass-disabled");
  const next = String(formData.get("next") || "/admin");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export interface SignupState {
  error?: string;
}

/**
 * Gated admin signup. Only works when setup mode is on (ALLOW_ADMIN_SIGNUP),
 * and only for emails permitted by ADMIN_ALLOWED_EMAILS (when that list is
 * set). The very first account becomes OWNER; later accounts become ADMIN.
 * Random visitors can never self-promote: with signup disabled the action
 * refuses outright.
 */
export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  if (!isAdminSignupAllowed()) {
    return { error: "Admin signup is disabled." };
  }

  const ip = clientIp(await headers());
  if (!rateLimit(`signup:${ip}`, 5, 60_000).success) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  if (String(formData.get("confirmPassword") || "") !== parsed.data.password) {
    return { error: "Passwords do not match." };
  }

  const { name, email, password } = parsed.data;
  if (!adminEmailAllowed(email)) {
    return { error: "This email is not permitted to create an admin account." };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists. Please sign in." };
  }

  const userCount = await db.user.count();
  const role = userCount === 0 ? "OWNER" : "ADMIN";
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { name, email, passwordHash, role, isActive: true },
  });

  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
  redirect("/admin");
}
