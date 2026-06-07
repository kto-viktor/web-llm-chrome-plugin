/**
 * Minimal in-memory per-IP rate limiter (fixed window).
 *
 * This is the "real" abuse protection layer from docs/backend-setup.md — the
 * bearer secret only deters drive-by traffic. In-memory state is per-process,
 * which is fine for a single adapter instance behind one reverse proxy. If you
 * scale to multiple instances, move this to a shared store (Redis) or enforce
 * the limit at the proxy instead.
 */

export function createRateLimiter({ limit, windowMs }) {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const hits = new Map();

  // Opportunistic cleanup so the map doesn't grow unbounded for one-off IPs.
  function sweep(now) {
    for (const [ip, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(ip);
    }
  }

  /**
   * @returns {{ allowed: boolean, remaining: number, retryAfterSec: number }}
   */
  function take(ip) {
    const now = Date.now();
    if (hits.size > 10_000) sweep(now);

    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;

    const allowed = entry.count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - entry.count),
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { take };
}
