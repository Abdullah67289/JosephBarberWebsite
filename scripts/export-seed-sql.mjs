/**
 * Dumps the locally-seeded SQLite database (prisma/dev.db) into a flat SQL file
 * of INSERT statements, so the same demo content can be loaded into Cloudflare
 * D1 with:  wrangler d1 execute <db> --remote --file=d1/seed-data.sql
 *
 * Uses Node's built-in SQLite (node:sqlite, Node >= 22.5) — no extra deps.
 * Run:  npm run setup   (to (re)build dev.db)   then   node scripts/export-seed-sql.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new DatabaseSync(path.join(root, "prisma", "dev.db"));

function q(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "bigint") return String(v);
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) {
    return "X'" + Buffer.from(v).toString("hex") + "'";
  }
  return "'" + String(v).replace(/'/g, "''") + "'";
}

// Account + transactional tables are NEVER exported: this file is committed to
// a public repo, so no password hashes, sessions, customers or bookings may
// appear in it. The owner account is created separately with
// scripts/make-owner.mjs (whose output SQL is gitignored).
const EXCLUDED = new Set([
  "User",
  "UserPermission",
  "Customer",
  "Booking",
  "BookingAddon",
  "BookingEvent",
  "Order",
  "OrderItem",
  "ContactMessage",
  "NotificationLog",
  "AdminActionLog",
]);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'")
  .all()
  .map((r) => r.name)
  .filter((name) => !EXCLUDED.has(name));

const out = [
  "-- Auto-generated demo seed for Cloudflare D1. Do not edit by hand.",
  "-- Regenerate with: npm run setup && node scripts/export-seed-sql.mjs",
  "PRAGMA defer_foreign_keys = TRUE;",
  "",
];

let rowCount = 0;
for (const table of tables) {
  const rows = db.prepare(`SELECT * FROM "${table}"`).all();
  if (rows.length === 0) continue;
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  for (const row of rows) {
    const vals = cols.map((c) => q(row[c])).join(", ");
    out.push(`INSERT INTO "${table}" (${colList}) VALUES (${vals});`);
    rowCount += 1;
  }
  out.push("");
}

const outDir = path.join(root, "d1");
mkdirSync(outDir, { recursive: true });
const target = path.join(outDir, "seed-data.sql");
writeFileSync(target, out.join("\n"), "utf8");
db.close();
console.log(`Wrote ${rowCount} rows across ${tables.length} tables -> d1/seed-data.sql`);
