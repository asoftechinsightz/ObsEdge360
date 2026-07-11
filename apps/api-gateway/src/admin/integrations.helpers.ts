import { createHmac, createHash, randomUUID } from 'crypto';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerState {
  failureThreshold: number;
  resetTimeoutMs: number;
  state: CircuitState;
  failures: number;
  openedAt?: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  maxBackoffMs: number;
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const circuits = new Map<string, CircuitBreakerState>();

export function rateLimitOk(key: string, limitPerMin: number): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(key);
  if (!entry || entry.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= limitPerMin;
}

export function getCircuit(key: string, seed?: Partial<CircuitBreakerState>): CircuitBreakerState {
  let c = circuits.get(key);
  if (!c) {
    c = {
      failureThreshold: seed?.failureThreshold ?? 5,
      resetTimeoutMs: seed?.resetTimeoutMs ?? 60_000,
      state: 'closed',
      failures: 0,
    };
    circuits.set(key, c);
  }
  if (c.state === 'open' && c.openedAt && Date.now() - c.openedAt >= c.resetTimeoutMs) {
    c.state = 'half_open';
  }
  return c;
}

export function recordCircuitSuccess(key: string) {
  const c = getCircuit(key);
  c.failures = 0;
  c.state = 'closed';
  c.openedAt = undefined;
}

export function recordCircuitFailure(key: string) {
  const c = getCircuit(key);
  c.failures += 1;
  if (c.failures >= c.failureThreshold || c.state === 'half_open') {
    c.state = 'open';
    c.openedAt = Date.now();
  }
}

export function assertCircuitClosed(key: string) {
  const c = getCircuit(key);
  if (c.state === 'open') {
    throw new Error('circuit_open');
  }
}

export async function withRetry<T>(
  policy: RetryPolicy,
  fn: (attempt: number) => Promise<T>,
): Promise<{ result: T; attempts: number }> {
  let lastErr: Error | undefined;
  const max = Math.max(1, policy.maxAttempts);
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      const result = await fn(attempt);
      return { result, attempts: attempt };
    } catch (e) {
      lastErr = e as Error;
      if (attempt < max) {
        const delay = Math.min(policy.backoffMs * 2 ** (attempt - 1), policy.maxBackoffMs);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr ?? new Error('retry_exhausted');
}

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const parts = key.split('.');
    let cur: unknown = vars;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in (cur as object)) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return '';
      }
    }
    return cur == null ? '' : String(cur);
  });
}

export function signWebhookPayload(secret: string, body: string, timestamp: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export function correlationId(): string {
  return `oe360-${randomUUID()}`;
}

export function hashIdempotency(parts: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 64);
}

export function stripSecrets<T extends Record<string, unknown>>(config: T): T {
  const out = { ...config };
  for (const k of Object.keys(out)) {
    const lk = k.toLowerCase();
    if (lk.includes('password') || lk.includes('secret') || lk.includes('token') || lk === 'apikey' || lk === 'api_key') {
      out[k as keyof T] = '[redacted]' as T[keyof T];
    }
  }
  return out;
}
