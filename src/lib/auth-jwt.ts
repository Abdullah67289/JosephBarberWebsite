import { SignJWT, jwtVerify } from "jose";
import { assertProductionSecrets, env } from "./env";

/**
 * Edge-safe JWT helpers (no Node-only deps) so they can run in middleware.
 * The Node-only session helpers (cookies, bcrypt, DB) live in ./auth.
 */

export type Role = "OWNER" | "ADMIN" | "BARBER";

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  staffId?: string | null;
  isDevBypass?: boolean;
}

export const SESSION_COOKIE = "jm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey(): Uint8Array {
  assertProductionSecrets();
  return new TextEncoder().encode(env.authSecret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    staffId: payload.staffId ?? null,
    isDevBypass: payload.isDevBypass ?? false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: (payload.role as Role) ?? "BARBER",
      staffId: (payload.staffId as string | null) ?? null,
      isDevBypass: Boolean(payload.isDevBypass),
    };
  } catch {
    return null;
  }
}

export const ROLE_RANK: Record<Role, number> = { BARBER: 1, ADMIN: 2, OWNER: 3 };

/** Does `role` meet or exceed `required`? */
export function roleAtLeast(role: Role, required: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export { SESSION_TTL_SECONDS };
