import { getPlatformConfig } from '@opsedge360/platform-config';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const memory = new Map<string, CacheEntry>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;
let redisReady = false;
let redisAttempted = false;

async function getRedis() {
  if (redisAttempted) return redisClient;
  redisAttempted = true;
  const url = process.env.REDIS_URL;
  if (!url || process.env.CACHE_BACKEND === 'memory') return null;
  try {
    const { createClient } = await import('redis');
    const client = createClient({ url });
    client.on('error', () => undefined);
    await client.connect();
    redisClient = client;
    redisReady = true;
    console.log('[cache] Redis connected');
  } catch {
    console.warn('[cache] Redis unavailable — using in-memory fallback');
  }
  return redisClient;
}

function memGet(key: string): string | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key: string, value: string, ttlSec: number): void {
  if (memory.size > 5000) {
    const first = memory.keys().next().value;
    if (first) memory.delete(first);
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const cfg = getPlatformConfig();
  if (!cfg.cacheEnabled) return null;

  const redis = await getRedis();
  if (redis && redisReady) {
    const raw = await redis.get(key);
    if (raw) return JSON.parse(raw) as T;
    return null;
  }
  const raw = memGet(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSec?: number): Promise<void> {
  const cfg = getPlatformConfig();
  if (!cfg.cacheEnabled) return;
  const ttl = ttlSec ?? cfg.cacheTtlSec;
  const serialized = JSON.stringify(value);

  const redis = await getRedis();
  if (redis && redisReady) {
    await redis.setEx(key, ttl, serialized);
    return;
  }
  memSet(key, serialized, ttl);
}

export async function cacheDel(key: string): Promise<void> {
  memory.delete(key);
  const redis = await getRedis();
  if (redis && redisReady) {
    await redis.del(key).catch(() => undefined);
  }
}

export function tenantCacheKey(tenantId: string, namespace: string, suffix: string): string {
  return `t:${tenantId}:${namespace}:${suffix}`;
}
