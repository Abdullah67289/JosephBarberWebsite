import path from "node:path";
import { createRequire } from "node:module";
// Worker/D1 path uses the EDGE client, whose query-compiler WASM is imported as
// a raw `.wasm` module (via Prisma's workerd export condition). That gzips
// ~500 KiB smaller than the base64-embedded WASM in the default `@prisma/client`
// build — the difference between fitting and blowing the 3 MiB free-plan Worker
// size limit. The WASM is loaded lazily (first query), so importing this in
// Node/dev is harmless; the Node path below uses the base64 build instead.
import { PrismaClient } from "@prisma/client/edge";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Prisma client, dual-runtime:
 *
 * - Cloudflare Workers (OpenNext): the D1 binding only exists inside a request
 *   context, so a client is created lazily per request and bound to `env.DB`.
 * - Node (next dev, Railway, scripts): the classic file-SQLite singleton,
 *   cached on globalThis to survive dev hot-reloads.
 *
 * `db` stays a plain-looking object so the ~60 existing call sites keep
 * working unchanged; the Proxy resolves the right client on first use.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// One client per D1 binding object (bindings are stable per request/isolate).
const d1Clients = new WeakMap<object, PrismaClient>();

let onD1 = false;
/** True when the active runtime is Cloudflare Workers with a D1 binding. */
export function usingD1(): boolean {
  return onD1;
}

/**
 * Prisma 7's engine-free client has no implicit url-based connection — every
 * runtime must pass an explicit adapter. Resolve the local SQLite file the
 * same way the old `url = env("DATABASE_URL")` schema line did: relative
 * paths resolve against the prisma/ directory.
 */
function resolveSqliteFile(url: string): string {
  const stripped = url.replace(/^file:/, "");
  if (stripped === ":memory:" || path.isAbsolute(stripped)) return stripped;
  return path.join(process.cwd(), "prisma", stripped);
}

/**
 * require() a Node-only package at runtime. The specifier reaches the real
 * require as a *variable*, so neither webpack nor esbuild can trace the package
 * into the Worker bundle (a literal argument would be statically resolved and
 * re-bundle the base64 WASM build + the native better-sqlite3 binary). These
 * calls only ever run under Node — dev, the seed script, Node hosts.
 */
function nodeOnlyRequire<T = unknown>(spec: string): T {
  const req = createRequire(import.meta.url);
  return req(spec) as T;
}

function nodeClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const file = resolveSqliteFile(process.env.DATABASE_URL || "file:./dev.db");
  const { PrismaClient: NodePrismaClient } = nodeOnlyRequire<{
    PrismaClient: new (opts: unknown) => PrismaClient;
  }>("@prisma/client");
  const { PrismaBetterSqlite3 } = nodeOnlyRequire<{
    PrismaBetterSqlite3: new (opts: { url: string }) => unknown;
  }>("@prisma/adapter-better-sqlite3");
  const client = new NodePrismaClient({
    adapter: new PrismaBetterSqlite3({ url: file }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  globalForPrisma.prisma = client;
  return client;
}

function resolveClient(): PrismaClient {
  try {
    // Throws outside a Workers request context (next dev, Node hosts, build).
    const d1 = (getCloudflareContext() as unknown as { env?: Record<string, unknown> })?.env?.DB;
    if (d1) {
      onD1 = true;
      let client = d1Clients.get(d1 as object);
      if (!client) {
        client = new PrismaClient({ adapter: new PrismaD1(d1 as ConstructorParameters<typeof PrismaD1>[0]) });
        d1Clients.set(d1 as object, client);
      }
      return client;
    }
  } catch {
    // Not running on Cloudflare Workers — fall through to the Node client.
  }
  return nodeClient();
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = resolveClient();
    const value = client[prop as keyof PrismaClient];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
