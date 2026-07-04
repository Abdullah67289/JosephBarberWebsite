import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
  verifySession,
  roleAtLeast,
  type Role,
  type SessionPayload,
} from "./auth-jwt";
import { adminEmailAllowed, env, isDevAdminBypassAllowed, isLocalSiteUrl } from "./env";

export type { Role, SessionPayload };
export { roleAtLeast };

// ----------------------------------------------------------------- passwords
// WebCrypto PBKDF2 (Workers-safe); legacy bcrypt hashes verify + rehash on login.
import { hashPassword, verifyPassword, needsRehash } from "./password";
export { hashPassword, verifyPassword };

// ----------------------------------------------------------------- session

export async function createSession(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  staffId?: string | null;
  isDevBypass?: boolean;
}) {
  const cookieStore = await cookies();
  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    staffId: user.staffId ?? null,
    isDevBypass: user.isDevBypass ?? false,
  });
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Secure cookies require HTTPS. Don't mark Secure when the app is served
    // over http://localhost (e.g. `npm run build && npm start` for local
    // production testing) — the browser would silently drop the cookie and
    // bounce the user back to /admin/login. Real HTTPS deployments stay Secure.
    secure: env.isProduction && !isLocalSiteUrl(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Current admin session payload (null when signed out). */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  if (session.isDevBypass) return isDevAdminBypassAllowed() ? session : null;

  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true, staffId: true, isActive: true },
  });
  if (!user || !user.isActive || !adminEmailAllowed(user.email)) return null;
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    staffId: user.staffId,
  };
}

/** Redirect to login unless authenticated; returns the session otherwise. */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Require a minimum role, else redirect (login when anon, dashboard when too low). */
export async function requireRole(required: Role): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!roleAtLeast(session.role, required)) redirect("/admin?error=forbidden");
  return session;
}

// ----------------------------------------------------------------- credentials

/** Validate email + password against the DB; returns the user or null. */
export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.isActive) return null;
  if (!adminEmailAllowed(user.email)) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  const data: { lastLoginAt: Date; passwordHash?: string } = { lastLoginAt: new Date() };
  // Transparently upgrade legacy bcrypt hashes to the current PBKDF2 scheme.
  if (needsRehash(user.passwordHash)) data.passwordHash = await hashPassword(password);
  await db.user.update({ where: { id: user.id }, data });
  return user;
}

export async function createDevBypassSession() {
  if (!isDevAdminBypassAllowed()) return false;
  await createSession({
    id: "dev-admin-bypass",
    email: "dev-admin@localhost",
    name: "Dev Admin",
    role: "OWNER",
    staffId: null,
    isDevBypass: true,
  });
  return true;
}
