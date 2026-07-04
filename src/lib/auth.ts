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
import { PERMISSION_KEYS, isPermissionKey, type PermissionKey } from "./permissions";

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

// ----------------------------------------------------------------- permissions

/** Owner-only areas (settings, team). Redirects non-owners. */
export async function requireOwner(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "OWNER" && !session.isDevBypass) redirect("/admin?error=forbidden");
  return session;
}

/** True if the session may access a permission-gated area. */
export async function sessionHasPermission(session: SessionPayload, key: PermissionKey): Promise<boolean> {
  if (session.role === "OWNER" || session.isDevBypass) return true;
  const grant = await db.userPermission.findUnique({
    where: { userId_key: { userId: session.sub, key } },
    select: { id: true },
  });
  return Boolean(grant);
}

/** Require a specific permission, else redirect. Returns the session. */
export async function requirePermission(key: PermissionKey): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!(await sessionHasPermission(session, key))) redirect("/admin?error=forbidden");
  return session;
}

/** The set of permission keys this session can access (all keys for owners). */
export async function loadGrants(session: SessionPayload): Promise<Set<PermissionKey>> {
  if (session.role === "OWNER" || session.isDevBypass) return new Set(PERMISSION_KEYS);
  const rows = await db.userPermission.findMany({ where: { userId: session.sub }, select: { key: true } });
  return new Set(rows.map((r) => r.key).filter(isPermissionKey));
}

// ----------------------------------------------------------------- credentials

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

export type AuthResult =
  | { ok: true; user: Awaited<ReturnType<typeof db.user.findUnique>> & object }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; retryAfterMin: number };

/**
 * Validate email + password. Adds per-account lockout on top of the per-IP
 * rate limit: after MAX_FAILED_LOGINS failures the account is locked for
 * LOCKOUT_MINUTES, which blunts distributed brute force that rotates IPs.
 */
export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  // Verify a dummy hash for unknown/inactive users so response timing doesn't
  // reveal whether the account exists.
  if (!user || !user.isActive || !adminEmailAllowed(user.email)) {
    await verifyPassword(password, DUMMY_HASH);
    return { ok: false, reason: "invalid" };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const retryAfterMin = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return { ok: false, reason: "locked", retryAfterMin };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    const locked = failed >= MAX_FAILED_LOGINS;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: locked ? 0 : failed,
        lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
      },
    });
    if (locked) return { ok: false, reason: "locked", retryAfterMin: LOCKOUT_MINUTES };
    return { ok: false, reason: "invalid" };
  }

  const data: { lastLoginAt: Date; failedLoginCount: number; lockedUntil: null; passwordHash?: string } = {
    lastLoginAt: new Date(),
    failedLoginCount: 0,
    lockedUntil: null,
  };
  // Transparently upgrade legacy bcrypt hashes to the current PBKDF2 scheme.
  if (needsRehash(user.passwordHash)) data.passwordHash = await hashPassword(password);
  await db.user.update({ where: { id: user.id }, data });
  return { ok: true, user };
}

// A valid PBKDF2 hash of a random string — used only to equalize timing.
const DUMMY_HASH =
  "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$3q2+7wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

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
