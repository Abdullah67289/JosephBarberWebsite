import { PrismaClient } from "@prisma/client";
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

function nodeClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
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
