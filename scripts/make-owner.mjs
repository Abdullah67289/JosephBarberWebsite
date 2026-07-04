/**
 * Provisions the shop owner account for Cloudflare D1 WITHOUT any credential
 * material touching the repo:
 *
 *   node scripts/make-owner.mjs [password]
 *
 * - Generates a strong random password when none is given, prints it ONCE.
 * - Hashes it with the app's exact PBKDF2 scheme (src/lib/password.ts).
 * - Writes d1/owner-setup.sql (gitignored) ready for:
 *     npx wrangler d1 execute joseph-mikes-barbershop --remote --file=d1/owner-setup.sql
 *
 * The owner email is fixed on purpose — the owner account is the root of the
 * permission system and must not drift via env vars.
 */
import { webcrypto as crypto } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OWNER_EMAIL = "cosimo.pedulla3@gmail.com";
const OWNER_NAME = "Cosimo Pedulla";
const ITERATIONS = 100_000;
const KEY_BYTES = 32;

function generatePassword() {
  // 4 groups of 5 from an unambiguous alphabet + fixed suffix guaranteeing
  // letter+number+symbol classes. ~100 bits of entropy.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  let out = "";
  let used = 0;
  for (const b of bytes) {
    if (b >= 216) continue; // 216 = 4 * 54, rejection sampling for uniformity
    out += alphabet[b % alphabet.length];
    used += 1;
    if (used === 20) break;
    if (used % 5 === 0) out += "-";
  }
  return out + "!7";
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, keyMaterial, KEY_BYTES * 8);
  return `pbkdf2$${ITERATIONS}$${Buffer.from(salt).toString("base64")}$${Buffer.from(bits).toString("base64")}`;
}

function cuidish() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "c" + Buffer.from(bytes).toString("hex");
}

const password = process.argv[2] || generatePassword();
if (process.argv[2] && process.argv[2].length < 12) {
  console.error("Refusing: owner password must be at least 12 characters.");
  process.exit(1);
}
const hash = await hashPassword(password);
const id = cuidish();
const now = Date.now();

const sql = `-- Owner account bootstrap. THIS FILE IS GITIGNORED — never commit it.
-- Apply with: npx wrangler d1 execute joseph-mikes-barbershop --remote --file=d1/owner-setup.sql
INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "isActive", "staffId", "failedLoginCount", "createdAt", "updatedAt")
VALUES (
  '${id}',
  '${OWNER_EMAIL}',
  '${OWNER_NAME}',
  '${hash}',
  'OWNER',
  1,
  (SELECT "id" FROM "Staff" WHERE "slug" = 'cosimo-pedulla'),
  0,
  ${now},
  ${now}
)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = excluded."passwordHash",
  "role" = 'OWNER',
  "isActive" = 1,
  "failedLoginCount" = 0,
  "lockedUntil" = NULL,
  "updatedAt" = ${now};
`;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(path.join(root, "d1"), { recursive: true });
writeFileSync(path.join(root, "d1", "owner-setup.sql"), sql, "utf8");

console.log("Owner:    " + OWNER_EMAIL);
console.log("Password: " + password);
console.log("");
console.log("Written to d1/owner-setup.sql (gitignored).");
console.log("Apply remotely: npx wrangler d1 execute joseph-mikes-barbershop --remote --file=d1/owner-setup.sql");
