import { Injectable } from '@nestjs/common';
import { cacheGet, cacheSet, tenantCacheKey } from '@opsedge360/cache';
import { getPlatformConfig } from '@opsedge360/platform-config';

export type CacheNamespace =
  | 'dashboard'
  | 'executive'
  | 'topology'
  | 'cmdb'
  | 'compliance'
  | 'security'
  | 'reports'
  | 'reference'
  | 'ai';

const NAMESPACE_TTL_SEC: Record<CacheNamespace, number> = {
  dashboard: 60,
  executive: 60,
  topology: 120,
  cmdb: 90,
  compliance: 120,
  security: 60,
  reports: 300,
  reference: 600,
  ai: 30,
};

@Injectable()
export class DashboardCacheService {
  getTtl(namespace: CacheNamespace): number {
    const cfg = getPlatformConfig();
    const override = process.env[`CACHE_TTL_${namespace.toUpperCase()}`];
    if (override && Number.isFinite(Number(override))) return Number(override);
    return NAMESPACE_TTL_SEC[namespace] ?? cfg.cacheTtlSec;
  }

  async getOrSet<T>(
    tenantId: string,
    namespace: CacheNamespace,
    key: string,
    factory: () => Promise<T>,
  ): Promise<{ value: T; cacheHit: boolean }> {
    const cfg = getPlatformConfig();
    const cacheKey = tenantCacheKey(tenantId, namespace, key);
    if (cfg.cacheEnabled) {
      const hit = await cacheGet<T>(cacheKey);
      if (hit !== null) return { value: hit, cacheHit: true };
    }
    const value = await factory();
    if (cfg.cacheEnabled) {
      await cacheSet(cacheKey, value, this.getTtl(namespace));
    }
    return { value, cacheHit: false };
  }

  async invalidate(tenantId: string, namespace: CacheNamespace, key: string): Promise<void> {
    const cacheKey = tenantCacheKey(tenantId, namespace, key);
    await cacheSet(cacheKey, null, 1);
  }
}
