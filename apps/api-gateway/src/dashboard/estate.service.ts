import { Injectable } from '@nestjs/common';
import { ProxyService } from '../proxy.service';
import type { CmdbStatsPayload } from './executive-data.service';

@Injectable()
export class EstateService {
  constructor(private readonly proxy: ProxyService) {}

  async getStats(tenantId: string): Promise<CmdbStatsPayload | null> {
    try {
      const res = await this.proxy.cmdb('/stats', { tenantId });
      return res.data as CmdbStatsPayload;
    } catch {
      return null;
    }
  }
}
