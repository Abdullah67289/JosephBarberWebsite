/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Good enough for a single-instance barbershop deployment and to blunt abuse
 * of the public booking/contact endpoints. For multi-instance hosting swap the
 * store for Redis/Upstash — the call sites stay identical.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  evictStale(now);
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

/** Derive a best-effort client IP from request headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

// Lazily evict stale buckets to bound memory. A module-scope setInterval is
// deliberately avoided: Cloudflare Workers throw on timers created in global
// scope, which would 500 every route importing this module.
let lastEviction = 0;
function evictStale(now: number) {
  if (now - lastEviction < 60_000) return;
  lastEviction = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}
