// Prisma 7 CLI configuration — used ONLY by `prisma db push` / `prisma migrate`
// for their own connection (schema push, diffing). The running app never
// reads this: it always connects through an explicit driver adapter
// (src/lib/db.ts) — PrismaBetterSqlite3 locally, PrismaD1 on Workers.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
