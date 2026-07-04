/**
 * Password hashing on WebCrypto PBKDF2 so the exact same code runs on Node
 * AND Cloudflare Workers. bcrypt (pure JS) costs seconds of CPU per hash on
 * Workers, which blows the request CPU budget; PBKDF2 is native in both
 * runtimes. Workers cap PBKDF2 at 100k iterations, so that is the ceiling.
 *
 * Stored format: pbkdf2$<iterations>$<saltBase64>$<hashBase64>
 * Legacy bcrypt hashes ($2a$/$2b$, from older local databases) still verify
 * through bcryptjs; callers should rehash on successful login (needsRehash).
 */

const ITERATIONS = 100_000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

const enc = new TextEncoder();

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    keyMaterial,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${Buffer.from(salt).toString("base64")}$${Buffer.from(hash).toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2$")) {
    const [, iterRaw, saltB64, hashB64] = stored.split("$");
    const iterations = Number(iterRaw);
    if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) return false;
    if (!saltB64 || !hashB64) return false;
    const salt = new Uint8Array(Buffer.from(saltB64, "base64"));
    const expected = new Uint8Array(Buffer.from(hashB64, "base64"));
    const actual = await derive(password, salt, iterations);
    return timingSafeEqualBytes(actual, expected);
  }
  if (stored.startsWith("$2")) {
    // Legacy bcrypt hash (pre-migration database). Pure JS, so it works
    // everywhere — just slowly. Rehash on login retires these.
    const bcrypt = (await import("bcryptjs")).default;
    return bcrypt.compare(password, stored);
  }
  return false;
}

/** True when a stored hash should be upgraded to the current scheme. */
export function needsRehash(stored: string): boolean {
  return !stored.startsWith(`pbkdf2$${ITERATIONS}$`);
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
