import { Injectable, BadRequestException } from '@nestjs/common';
import axios, { type AxiosRequestConfig } from 'axios';
import { resolveTenantStrict } from '@opsedge360/shared-db';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProxyService {
  private readonly cmdbUrl = process.env.CMDB_URL ?? 'http://localhost:4002';
  private readonly discoveryUrl = process.env.DISCOVERY_URL ?? 'http://localhost:4001';
  private readonly observabilityUrl = process.env.OBSERVABILITY_URL ?? 'http://localhost:4003';
  private readonly complianceUrl = process.env.COMPLIANCE_URL ?? 'http://localhost:4004';
  private readonly transactionsUrl = process.env.TRANSACTIONS_URL ?? 'http://localhost:4005';
  private readonly aiAgentsUrl = process.env.AI_AGENTS_URL ?? 'http://localhost:5000';
  private readonly securityUrl = process.env.SECURITY_URL ?? 'http://localhost:4006';
  private readonly remediationUrl = process.env.REMEDIATION_URL ?? 'http://localhost:4007';
  private readonly analyticsUrl = process.env.ANALYTICS_URL ?? 'http://localhost:4008';
  private readonly quantumUrl = process.env.QUANTUM_URL ?? 'http://localhost:4009';
  private readonly governanceUrl = process.env.GOVERNANCE_URL ?? 'http://localhost:4010';

  /** Resolve slug or UUID to canonical tenant UUID for downstream X-Tenant-ID. */
  async resolveTenantHeader(tenantId?: string): Promise<string | undefined> {
    if (!tenantId?.trim()) return undefined;
    if (UUID_RE.test(tenantId.trim())) return tenantId.trim();
    if (process.env.TENANT_RESOLVE === 'legacy') {
      return tenantId.trim();
    }
    try {
      const row = await resolveTenantStrict(tenantId);
      return row.id;
    } catch (err) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'TENANT_UNKNOWN',
        message: (err as Error).message || 'Unknown tenant',
      });
    }
  }

  async forward(
    baseUrl: string,
    path: string,
    options: {
      method?: string;
      body?: unknown;
      tenantId?: string;
      query?: Record<string, string>;
      headers?: Record<string, string>;
      responseType?: 'json' | 'text';
    } = {},
  ) {
    const tenantUuid = await this.resolveTenantHeader(options.tenantId);
    const config: AxiosRequestConfig = {
      method: (options.method ?? 'GET') as AxiosRequestConfig['method'],
      url: `${baseUrl}${path}`,
      headers: {
        'Content-Type': 'application/json',
        ...(tenantUuid ? { 'X-Tenant-ID': tenantUuid } : {}),
        ...(options.headers ?? {}),
      },
      params: options.query,
      data: options.body,
      responseType: options.responseType ?? 'json',
      validateStatus: () => true,
      timeout: Number(process.env.PROXY_TIMEOUT_MS ?? 5000),
    };
    const res = await axios(config);
    return { status: res.status, data: res.data };
  }

  cmdb(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.cmdbUrl, path, opts);
  }

  discovery(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.discoveryUrl, path, opts);
  }

  observability(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.observabilityUrl, path, opts);
  }

  compliance(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.complianceUrl, path, opts);
  }

  transactions(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.transactionsUrl, path, opts);
  }

  aiAgents(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.aiAgentsUrl, path, opts);
  }

  security(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.securityUrl, path, opts);
  }

  remediation(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.remediationUrl, path, opts);
  }

  analytics(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.analyticsUrl, path, opts);
  }

  quantum(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.quantumUrl, path, opts);
  }

  governance(path: string, opts?: Parameters<ProxyService['forward']>[2]) {
    return this.forward(this.governanceUrl, path, opts);
  }
}
