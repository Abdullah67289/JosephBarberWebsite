// Smoke-test public + admin routes against the running dev server.
// Mints a real session cookie (same secret/format as the app) to exercise
// authenticated admin pages. Usage: node scripts/smoke-routes.mjs
import { readFileSync } from "node:fs";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const db = new PrismaClient();
let failures = 0;

function envFromFile(name) {
  if (process.env[name]) return process.env[name];
  const txt = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const m = txt.match(new RegExp(`^${name}="?([^"\\n]*)"?`, "m"));
  return m ? m[1] : "";
}

async function head(path, cookie) {
  const res = await fetch(BASE + path, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  return res.status;
}

async function main() {
  const secret = new TextEncoder().encode(envFromFile("AUTH_SECRET"));
  const owner = await db.user.findFirst({ where: { role: "OWNER" } });
  if (!owner) throw new Error("No owner user — run the seed.");

  const token = await new SignJWT({ email: owner.email, name: owner.name, role: owner.role, staffId: owner.staffId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(owner.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const cookie = `jm_session=${token}`;

  const publicRoutes = ["/", "/services", "/gallery", "/story", "/contact", "/faq", "/shop", "/shop/checkout", "/book"];
  const adminRoutes = [
    "/admin",
    "/admin/bookings",
    "/admin/content",
    "/admin/services",
    "/admin/staff",
    "/admin/availability",
    "/admin/products",
    "/admin/orders",
    "/admin/gallery",
    "/admin/reviews",
    "/admin/messages",
    "/admin/settings",
  ];

  console.log("— Public routes —");
  for (const r of publicRoutes) {
    const s = await head(r);
    const ok = s === 200;
    if (!ok) failures++;
    console.log(`${ok ? "✓" : "✗"} ${s}  ${r}`);
  }

  console.log("— Admin routes (unauthenticated → expect 307 redirect) —");
  for (const r of ["/admin", "/admin/settings"]) {
    const s = await head(r);
    const ok = s === 307 || s === 302;
    if (!ok) failures++;
    console.log(`${ok ? "✓" : "✗"} ${s}  ${r} (guard)`);
  }

  console.log("— Admin routes (authenticated → expect 200) —");
  for (const r of adminRoutes) {
    const s = await head(r, cookie);
    const ok = s === 200;
    if (!ok) failures++;
    console.log(`${ok ? "✓" : "✗"} ${s}  ${r}`);
  }

  console.log(`\n${failures === 0 ? "ALL ROUTES OK ✓" : failures + " ROUTE(S) FAILED ✗"}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
