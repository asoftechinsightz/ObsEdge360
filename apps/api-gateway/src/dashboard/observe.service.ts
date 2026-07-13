import { Injectable } from '@nestjs/common';
import { ExecutiveDataService, type ServiceRow } from './executive-data.service';

@Injectable()
export class ObserveService {
  constructor(private readonly executiveData: ExecutiveDataService) {}

  getServices(tenantId: string): Promise<ServiceRow[]> {
    return this.executiveData.getServices(tenantId);
  }
}
