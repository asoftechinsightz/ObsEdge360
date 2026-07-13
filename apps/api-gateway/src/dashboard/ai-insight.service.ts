import { Injectable } from '@nestjs/common';
import { ExecutiveDataService, type RecommendationsPayload } from './executive-data.service';
import type { ExecutiveNarrative } from '@opsedge360/shared-types';

@Injectable()
export class AiInsightService {
  constructor(private readonly executiveData: ExecutiveDataService) {}

  getNarrative(tenantId: string): Promise<ExecutiveNarrative> {
    return this.executiveData.getNarrative(tenantId);
  }

  getRecommendations(tenantId: string): Promise<RecommendationsPayload> {
    return this.executiveData.getRecommendations(tenantId);
  }
}
