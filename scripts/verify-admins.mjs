import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
for (const [email, pw] of [["admin@test.com","Admin123!"],["owner@josephandmikes.com","ChangeMe!2024"]]) {
  const u = await db.user.findUnique({ where: { email } });
  if (!u) { console.log("MISSING", email); continue; }
  const ok = await bcrypt.compare(pw, u.passwordHash);
  console.log(`${ok ? "OK " : "BAD"}  ${email}  role=${u.role}  active=${u.isActive}`);
}
await db.$disconnect();
