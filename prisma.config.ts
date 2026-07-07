// Prisma 7 CLI configuration — used ONLY by `prisma db push` / `prisma migrate`
// for their own connection (schema push, diffing). The running app never
// reads this: it always connects through an explicit driver adapter
// (src/lib/db.ts) — PrismaBetterSqlite3 locally, PrismaD1 on Workers.
//
// A plain fallback (not Prisma's `env()` helper, which throws hard when the
// variable is merely unset) keeps `prisma generate` working in Cloudflare's
// build environment, where DATABASE_URL is deliberately never set — nothing
// at build or runtime there ever uses this datasource connection.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
