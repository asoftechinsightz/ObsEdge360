/** Simple in-memory rate limit for auth endpoints (pen-test remediation). */

const hits = new Map<string, { count: number; resetAt: number }>();

export function authRateLimitOk(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
