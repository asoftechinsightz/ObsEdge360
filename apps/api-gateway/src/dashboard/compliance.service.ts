import { Injectable } from '@nestjs/common';
import { ProxyService } from '../proxy.service';

@Injectable()
export class ComplianceService {
  constructor(private readonly proxy: ProxyService) {}

  async getScore(tenantId: string): Promise<number | null> {
    try {
      const res = await this.proxy.compliance('/score', { tenantId });
      const data = res.data as { overallScore?: number };
      return typeof data.overallScore === 'number' ? data.overallScore : null;
    } catch {
      return null;
    }
  }
}
