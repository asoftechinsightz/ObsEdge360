import { Injectable } from '@nestjs/common';
import { cacheGet, cacheSet, tenantCacheKey } from '@opsedge360/cache';
import { getPlatformConfig } from '@opsedge360/platform-config';

@Injectable()
export class CacheService {
  async getOrSet<T>(tenantId: string, namespace: string, key: string, factory: () => Promise<T>): Promise<T> {
    const cacheKey = tenantCacheKey(tenantId, namespace, key);
    const hit = await cacheGet<T>(cacheKey);
    if (hit !== null) return hit;
    const value = await factory();
    await cacheSet(cacheKey, value);
    return value;
  }

  get config() {
    return getPlatformConfig();
  }
}
