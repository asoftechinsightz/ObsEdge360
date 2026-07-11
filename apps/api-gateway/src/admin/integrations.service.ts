import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import axios, { type AxiosRequestConfig } from 'axios';
import { createSecretsProvider } from '@opsedge360/shared-security';
import { query, queryOne } from '@opsedge360/shared-db';
import type { JwtPayload } from '../auth/auth.service';
import { AuthService } from '../auth/auth.service';
import {
  assertCircuitClosed,
  correlationId,
  hashIdempotency,
  rateLimitOk,
  recordCircuitFailure,
  recordCircuitSuccess,
  renderTemplate,
  signWebhookPayload,
  stripSecrets,
  withRetry,
  type RetryPolicy,
} from './integrations.helpers';
import { ldapSearchUsers, ldapTestBind } from './integrations.ldap';

function requireAdmin(user: JwtPayload) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
}
function requireTenant(tenantId?: string): string {
  if (!tenantId) throw new BadRequestException('Tenant context required');
  return tenantId;
}

const CATALOG = [
  { type: 'servicenow', name: 'ServiceNow', version: '1.0.0', capabilities: ['incident', 'change', 'cmdb_metadata'] },
  { type: 'jira', name: 'Jira Service Management', version: '1.0.0', capabilities: ['ticket', 'status_sync', 'automation_link'] },
  { type: 'email', name: 'Email', version: '1.0.0', capabilities: ['notify'] },
  { type: 'slack', name: 'Slack', version: '1.0.0', capabilities: ['notify'] },
  { type: 'teams', name: 'Microsoft Teams', version: '1.0.0', capabilities: ['notify'] },
  { type: 'webhook', name: 'Generic Webhook', version: '1.0.0', capabilities: ['notify'] },
  { type: 'ldap', name: 'LDAP', version: '1.0.0', capabilities: ['identity', 'sync'] },
  { type: 'active_directory', name: 'Microsoft Active Directory', version: '1.0.0', capabilities: ['identity', 'sync'] },
  { type: 'oidc', name: 'OpenID Connect', version: '1.0.0', capabilities: ['identity'] },
  { type: 'saml', name: 'SAML 2.0', version: '1.0.0', capabilities: ['identity'] },
] as const;

@Injectable()
export class IntegrationsService {
  private secrets = createSecretsProvider(process.env.SECRETS_PROVIDER);

  constructor(private readonly auth: AuthService) {}

  private async audit(
    tenantId: string,
    actorId: string | undefined,
    action: string,
    connectorId?: string,
    detail?: Record<string, unknown>,
    idempotencyKey?: string,
    corr?: string,
  ) {
    try {
      await query(
        `INSERT INTO connector_audit (tenant_id, connector_id, actor_id, action, idempotency_key, correlation_id, detail)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
         ON CONFLICT DO NOTHING`,
        [
          tenantId,
          connectorId ?? null,
          actorId ?? null,
          action,
          idempotencyKey ?? null,
          corr ?? null,
          JSON.stringify(detail ?? {}),
        ],
      );
    } catch {
      await query(
        `INSERT INTO connector_audit (tenant_id, connector_id, actor_id, action, correlation_id, detail)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [tenantId, connectorId ?? null, actorId ?? null, action, corr ?? null, JSON.stringify(detail ?? {})],
      );
    }
    try {
      await query(
        `INSERT INTO governance_audit_events (tenant_id, actor_id, action, resource_type, resource_id, detail)
         VALUES ($1,$2,$3,'integration',$4,$5::jsonb)`,
        [tenantId, actorId ?? null, `integration.${action}`, connectorId ?? null, JSON.stringify(detail ?? {})],
      );
    } catch {
      /* optional */
    }
  }

  private async revealSecret(tenantId: string, secretRef?: string | null): Promise<Record<string, string>> {
    if (!secretRef) return {};
    const revealed = await this.secrets.reveal(tenantId, secretRef);
    try {
      const parsed = JSON.parse(revealed.value) as Record<string, string>;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* plain string token */
    }
    return { token: revealed.value, password: revealed.value, apiKey: revealed.value };
  }

  private retryFrom(row: { retry_policy?: RetryPolicy | string }): RetryPolicy {
    const p = typeof row.retry_policy === 'string' ? JSON.parse(row.retry_policy) : row.retry_policy;
    return {
      maxAttempts: Number(p?.maxAttempts ?? 3),
      backoffMs: Number(p?.backoffMs ?? 1000),
      maxBackoffMs: Number(p?.maxBackoffMs ?? 30000),
    };
  }

  async dashboard(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const counts = await queryOne<{
      connectors: string;
      healthy: string;
      channels: string;
      deliveries: string;
      providers: string;
      syncJobs: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM integration_connectors WHERE tenant_id=$1) AS connectors,
         (SELECT COUNT(*)::text FROM integration_connectors WHERE tenant_id=$1 AND health_status='healthy') AS healthy,
         (SELECT COUNT(*)::text FROM enterprise_notification_channels WHERE tenant_id=$1) AS channels,
         (SELECT COUNT(*)::text FROM enterprise_notification_deliveries WHERE tenant_id=$1) AS deliveries,
         (SELECT COUNT(*)::text FROM identity_providers WHERE tenant_id=$1) AS providers,
         (SELECT COUNT(*)::text FROM identity_sync_jobs WHERE tenant_id=$1) AS syncJobs`,
      [tid],
    );
    return {
      wave: 'v1.0.0-wave5',
      gaClaim: false,
      catalogSize: CATALOG.length,
      counts: {
        connectors: Number(counts?.connectors ?? 0),
        healthy: Number(counts?.healthy ?? 0),
        channels: Number(counts?.channels ?? 0),
        deliveries: Number(counts?.deliveries ?? 0),
        identityProviders: Number(counts?.providers ?? 0),
        syncJobs: Number(counts?.syncJobs ?? 0),
      },
      metricsHints: {
        prometheus: [
          'opsedge_integration_connectors_total',
          'opsedge_integration_health',
          'opsedge_notification_deliveries_total',
          'opsedge_identity_sync_total',
        ],
      },
      checkedAt: new Date().toISOString(),
    };
  }

  catalog() {
    return { connectors: CATALOG, hotPluggable: true, version: '1.0.0' };
  }

  async listConnectors(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const connectors = await query(
      `SELECT id, tenant_id, connector_type, name, config, status, enabled, version, secret_ref,
              health_status, last_health_at, last_success_at, last_error, retry_policy, circuit_breaker,
              created_at, updated_at
       FROM integration_connectors WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tid],
    );
    return {
      connectors: connectors.map((c) => ({
        ...c,
        config: stripSecrets((c.config as Record<string, unknown>) ?? {}),
        secret_ref: c.secret_ref ? '[ref]' : null,
        hasSecretRef: !!c.secret_ref,
      })),
    };
  }

  async registerConnector(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      connectorType: string;
      name: string;
      config?: Record<string, unknown>;
      secretRef?: string;
      enabled?: boolean;
      retryPolicy?: RetryPolicy;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.connectorType || !body.name) throw new BadRequestException('connectorType and name required');
    if (!CATALOG.some((c) => c.type === body.connectorType)) {
      throw new BadRequestException(`Unknown connector type: ${body.connectorType}`);
    }
    const cfg = { ...(body.config ?? {}) };
    // Strip any plaintext credentials mistakenly sent
    for (const k of Object.keys(cfg)) {
      const lk = k.toLowerCase();
      if (lk.includes('password') || lk.includes('secret') || lk.includes('token') || lk === 'apikey') {
        delete cfg[k];
      }
    }
    if (body.secretRef) {
      const meta = await this.secrets.getMetadata(tid, body.secretRef).catch(() => null);
      if (!meta) throw new BadRequestException('secretRef not found for tenant');
    }
    const row = await queryOne(
      `INSERT INTO integration_connectors
         (tenant_id, connector_type, name, config, status, secret_ref, enabled, retry_policy, health_status)
       VALUES ($1,$2,$3,$4::jsonb,'configured',$5,$6,$7::jsonb,'unknown')
       RETURNING *`,
      [
        tid,
        body.connectorType,
        body.name,
        JSON.stringify(cfg),
        body.secretRef ?? null,
        body.enabled ?? true,
        JSON.stringify(body.retryPolicy ?? { maxAttempts: 3, backoffMs: 1000, maxBackoffMs: 30000 }),
      ],
    );
    await this.audit(tid, user.sub, 'connector.registered', String(row?.id), {
      type: body.connectorType,
      name: body.name,
    });
    return { ...row, config: stripSecrets(cfg), hasSecretRef: !!body.secretRef };
  }

  async updateConnector(
    tenantId: string | undefined,
    user: JwtPayload,
    id: string,
    body: { name?: string; config?: Record<string, unknown>; secretRef?: string | null; enabled?: boolean },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const existing = await queryOne(`SELECT id FROM integration_connectors WHERE id=$1 AND tenant_id=$2`, [id, tid]);
    if (!existing) throw new NotFoundException('Connector not found');
    const row = await queryOne(
      `UPDATE integration_connectors SET
         name = COALESCE($3, name),
         config = CASE WHEN $4::jsonb IS NULL THEN config ELSE COALESCE(config,'{}'::jsonb) || $4::jsonb END,
         secret_ref = CASE
           WHEN $5::boolean IS NULL THEN secret_ref
           WHEN $5::boolean = false THEN NULL
           ELSE $6::uuid
         END,
         enabled = COALESCE($7, enabled),
         updated_at = NOW()
       WHERE id=$1 AND tenant_id=$2
       RETURNING *`,
      [
        id,
        tid,
        body.name ?? null,
        body.config ? JSON.stringify(body.config) : null,
        body.secretRef === undefined ? null : body.secretRef !== null,
        body.secretRef ?? null,
        body.enabled ?? null,
      ],
    );
    await this.audit(tid, user.sub, 'connector.updated', id, { enabled: body.enabled });
    return row;
  }

  async testConnector(tenantId: string | undefined, user: JwtPayload, id?: string, body?: { connectorId?: string }) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const connectorId = id ?? body?.connectorId;
    if (!connectorId) throw new BadRequestException('connectorId required');
    const connector = await queryOne<Record<string, unknown>>(
      `SELECT * FROM integration_connectors WHERE id=$1 AND tenant_id=$2`,
      [connectorId, tid],
    );
    if (!connector) throw new NotFoundException('Connector not found');
    const result = await this.probeConnector(tid, connector);
    await query(
      `INSERT INTO connector_health
         (tenant_id, connector_id, available, latency_ms, auth_ok, success_rate, retry_count, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        tid,
        connectorId,
        result.ok,
        result.latencyMs,
        result.authOk ?? result.ok,
        result.ok ? 100 : 0,
        result.attempts ?? 1,
        JSON.stringify(result),
      ],
    );
    await query(
      `UPDATE integration_connectors SET
         health_status=$3, last_health_at=NOW(), last_error=$4,
         last_success_at=CASE WHEN $5 THEN NOW() ELSE last_success_at END,
         status=CASE WHEN $5 THEN 'connected' ELSE status END,
         updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2`,
      [connectorId, tid, result.ok ? 'healthy' : 'unhealthy', result.error ?? null, result.ok],
    );
    await this.audit(tid, user.sub, 'connector.test', connectorId, { ok: result.ok, latencyMs: result.latencyMs });
    return result;
  }

  private async probeConnector(
    tid: string,
    connector: Record<string, unknown>,
  ): Promise<{ ok: boolean; latencyMs: number; authOk?: boolean; attempts?: number; error?: string; detail?: unknown }> {
    const type = String(connector.connector_type);
    const config = (connector.config ?? {}) as Record<string, unknown>;
    const circuitKey = `${tid}:${connector.id}`;
    try {
      assertCircuitClosed(circuitKey);
    } catch {
      return { ok: false, latencyMs: 0, error: 'circuit_open' };
    }
    const secrets = await this.revealSecret(tid, connector.secret_ref as string | null);
    const policy = this.retryFrom(connector as { retry_policy?: RetryPolicy });
    try {
      const { result, attempts } = await withRetry(policy, async () => {
        if (type === 'servicenow') return this.testServiceNow(config, secrets);
        if (type === 'jira') return this.testJira(config, secrets);
        if (type === 'webhook' || type === 'slack' || type === 'teams') return this.testHttpWebhook(config, secrets, type);
        if (type === 'email') return this.testEmail(config, secrets);
        if (type === 'ldap' || type === 'active_directory') return this.testLdap(config, secrets);
        if (type === 'oidc' || type === 'saml') {
          return {
            ok: !!(config.issuer || config.entryPoint || config.ssoProviderId),
            latencyMs: 0,
            authOk: true,
            detail: { note: 'Identity metadata validated; use /integrations/identity for sync' },
          };
        }
        throw new Error(`unsupported_type:${type}`);
      });
      recordCircuitSuccess(circuitKey);
      return { ...result, attempts };
    } catch (e) {
      recordCircuitFailure(circuitKey);
      return { ok: false, latencyMs: 0, error: (e as Error).message };
    }
  }

  private authHeader(secrets: Record<string, string>, config: Record<string, unknown>): Record<string, string> {
    if (secrets.username && secrets.password) {
      const basic = Buffer.from(`${secrets.username}:${secrets.password}`).toString('base64');
      return { Authorization: `Basic ${basic}` };
    }
    const token = secrets.token || secrets.apiKey || secrets.password;
    if (token) return { Authorization: `Bearer ${token}` };
    if (config.authHeader && typeof config.authHeader === 'string') return { Authorization: config.authHeader };
    return {};
  }

  private async testServiceNow(config: Record<string, unknown>, secrets: Record<string, string>) {
    const base = String(config.instanceUrl || config.baseUrl || '').replace(/\/$/, '');
    if (!base) throw new Error('instanceUrl required');
    const started = Date.now();
    const res = await axios.get(`${base}/api/now/table/incident`, {
      params: { sysparm_limit: 1 },
      headers: { Accept: 'application/json', ...this.authHeader(secrets, config) },
      timeout: Number(config.timeoutMs ?? 10000),
      validateStatus: () => true,
    });
    const ok = res.status >= 200 && res.status < 300;
    return { ok, latencyMs: Date.now() - started, authOk: res.status !== 401 && res.status !== 403, detail: { status: res.status } };
  }

  private async testJira(config: Record<string, unknown>, secrets: Record<string, string>) {
    const base = String(config.baseUrl || '').replace(/\/$/, '');
    if (!base) throw new Error('baseUrl required');
    const started = Date.now();
    const res = await axios.get(`${base}/rest/api/3/myself`, {
      headers: { Accept: 'application/json', ...this.authHeader(secrets, config) },
      timeout: Number(config.timeoutMs ?? 10000),
      validateStatus: () => true,
    });
    const ok = res.status >= 200 && res.status < 300;
    return { ok, latencyMs: Date.now() - started, authOk: res.status !== 401 && res.status !== 403, detail: { status: res.status } };
  }

  private async testHttpWebhook(config: Record<string, unknown>, secrets: Record<string, string>, type: string) {
    const url = String(config.webhookUrl || config.url || '');
    if (!url) throw new Error('webhookUrl required');
    const started = Date.now();
    const body = JSON.stringify({
      type: 'opsedge360.connection_test',
      channel: type,
      ts: new Date().toISOString(),
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const signSecret = secrets.signingSecret || secrets.token;
    if (signSecret) {
      headers['X-OpsEdge-Signature'] = signWebhookPayload(signSecret, body, ts);
      headers['X-OpsEdge-Timestamp'] = ts;
    }
    const res = await axios.post(url, body, {
      headers,
      timeout: Number(config.timeoutMs ?? 10000),
      validateStatus: () => true,
      transformRequest: [(d) => d],
    });
    const ok = res.status >= 200 && res.status < 300;
    return { ok, latencyMs: Date.now() - started, authOk: true, detail: { status: res.status } };
  }

  private async testEmail(config: Record<string, unknown>, secrets: Record<string, string>) {
    // Prefer HTTP email API (SendGrid-compatible) when apiUrl set; else SMTP TCP probe
    const apiUrl = String(config.apiUrl || '');
    if (apiUrl) {
      const started = Date.now();
      const res = await axios.get(apiUrl, {
        headers: this.authHeader(secrets, config),
        timeout: Number(config.timeoutMs ?? 8000),
        validateStatus: () => true,
      });
      return {
        ok: res.status < 500,
        latencyMs: Date.now() - started,
        authOk: res.status !== 401,
        detail: { status: res.status, mode: 'http_api' },
      };
    }
    const host = String(config.smtpHost || '');
    const port = Number(config.smtpPort ?? 587);
    if (!host) throw new Error('smtpHost or apiUrl required');
    const started = Date.now();
    await new Promise<void>((resolve, reject) => {
      const net = require('net') as typeof import('net');
      const sock = net.connect({ host, port }, () => {
        sock.end();
        resolve();
      });
      sock.setTimeout(8000);
      sock.on('error', reject);
      sock.on('timeout', () => {
        sock.destroy();
        reject(new Error('smtp_timeout'));
      });
    });
    return { ok: true, latencyMs: Date.now() - started, authOk: !!secrets.password, detail: { mode: 'smtp_tcp' } };
  }

  private async testLdap(config: Record<string, unknown>, secrets: Record<string, string>) {
    const host = String(config.host || '');
    if (!host) throw new Error('host required');
    const bindDn = String(config.bindDn || secrets.bindDn || '');
    const bindPassword = secrets.password || secrets.bindPassword || '';
    if (!bindDn || !bindPassword) throw new Error('bindDn and secret password required');
    const result = await ldapTestBind({
      host,
      port: config.port ? Number(config.port) : undefined,
      useTls: !!config.useTls,
      bindDn,
      bindPassword,
    });
    if (!result.ok) throw new Error(result.error || `ldap_bind_code_${result.code}`);
    return { ok: true, latencyMs: result.latencyMs, authOk: true, detail: { code: result.code } };
  }

  async listHealth(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const latest = await query(
      `SELECT DISTINCT ON (connector_id) *
       FROM connector_health WHERE tenant_id=$1
       ORDER BY connector_id, checked_at DESC`,
      [tid],
    );
    const connectors = await query(
      `SELECT id, name, connector_type, health_status, enabled, last_health_at, last_error
       FROM integration_connectors WHERE tenant_id=$1`,
      [tid],
    );
    return { connectors, snapshots: latest, wave: 'v1.0.0-wave5', gaClaim: false };
  }

  async itsmAction(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      connectorId: string;
      action: 'create_incident' | 'update_incident' | 'close_incident' | 'create_change' | 'create_ticket' | 'update_ticket' | 'sync_status' | 'cmdb_sync';
      payload: Record<string, unknown>;
      idempotencyKey?: string;
      correlationId?: string;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const connector = await queryOne<Record<string, unknown>>(
      `SELECT * FROM integration_connectors WHERE id=$1 AND tenant_id=$2 AND enabled=true`,
      [body.connectorId, tid],
    );
    if (!connector) throw new NotFoundException('Connector not found or disabled');
    const type = String(connector.connector_type);
    if (type !== 'servicenow' && type !== 'jira') throw new BadRequestException('ITSM actions require servicenow or jira connector');

    const idem = body.idempotencyKey || hashIdempotency([tid, body.connectorId, body.action, body.payload]);
    const existing = await queryOne(
      `SELECT * FROM connector_audit WHERE tenant_id=$1 AND idempotency_key=$2`,
      [tid, idem],
    );
    if (existing) {
      return { idempotentReplay: true, prior: existing, correlationId: existing.correlation_id };
    }

    const corr = body.correlationId || correlationId();
    const secrets = await this.revealSecret(tid, connector.secret_ref as string | null);
    const config = (connector.config ?? {}) as Record<string, unknown>;
    const circuitKey = `${tid}:${connector.id}`;
    assertCircuitClosed(circuitKey);

    let externalId = '';
    let response: unknown = {};
    try {
      if (type === 'servicenow') {
        const out = await this.serviceNowAction(config, secrets, body.action, body.payload, corr);
        externalId = out.externalId;
        response = out.response;
      } else {
        const out = await this.jiraAction(config, secrets, body.action, body.payload, corr);
        externalId = out.externalId;
        response = out.response;
      }
      recordCircuitSuccess(circuitKey);
    } catch (e) {
      recordCircuitFailure(circuitKey);
      await this.audit(tid, user.sub, `itsm.${body.action}.failed`, body.connectorId, { error: (e as Error).message }, idem, corr);
      throw e;
    }

    if (externalId) {
      await query(
        `INSERT INTO itsm_correlation_map
           (tenant_id, connector_id, external_system, external_id, correlation_id, resource_type, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
         ON CONFLICT (tenant_id, connector_id, external_system, external_id)
         DO UPDATE SET correlation_id=EXCLUDED.correlation_id, metadata=EXCLUDED.metadata, updated_at=NOW()`,
        [
          tid,
          body.connectorId,
          type,
          externalId,
          corr,
          body.action.includes('change') ? 'change' : body.action.includes('ticket') ? 'ticket' : 'incident',
          JSON.stringify({ action: body.action }),
        ],
      );
    }

    await this.audit(
      tid,
      user.sub,
      `itsm.${body.action}`,
      body.connectorId,
      { externalId, response },
      idem,
      corr,
    );
    return { ok: true, correlationId: corr, externalId, response, idempotencyKey: idem };
  }

  private async serviceNowAction(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    action: string,
    payload: Record<string, unknown>,
    corr: string,
  ) {
    const base = String(config.instanceUrl || config.baseUrl || '').replace(/\/$/, '');
    if (!base) throw new BadRequestException('ServiceNow instanceUrl required');
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Correlation-Id': corr,
      ...this.authHeader(secrets, config),
    };
    const ax: AxiosRequestConfig = { headers, timeout: Number(config.timeoutMs ?? 15000), validateStatus: () => true };

    if (action === 'cmdb_sync') {
      const res = await axios.get(`${base}/api/now/table/cmdb_ci`, { ...ax, params: { sysparm_limit: Number(payload.limit ?? 10) } });
      if (res.status >= 300) throw new BadRequestException(`ServiceNow CMDB sync failed: ${res.status}`);
      return { externalId: 'cmdb-metadata', response: { count: (res.data?.result || []).length, metadataOnly: true } };
    }
    if (action === 'create_incident' || action === 'create_change') {
      const table = action === 'create_change' ? 'change_request' : 'incident';
      const body: Record<string, unknown> = {
        short_description: payload.shortDescription || payload.summary,
        description: payload.description,
        correlation_id: corr,
      };
      if (payload.fields && typeof payload.fields === 'object' && !Array.isArray(payload.fields)) {
        Object.assign(body, payload.fields as Record<string, unknown>);
      }
      const res = await axios.post(`${base}/api/now/table/${table}`, body, ax);
      if (res.status >= 300) throw new BadRequestException(`ServiceNow create failed: ${res.status}`);
      const sysId = res.data?.result?.sys_id || '';
      return { externalId: String(sysId), response: res.data?.result };
    }
    const sysId = String(payload.sysId || payload.externalId || '');
    if (!sysId) throw new BadRequestException('sysId required');
    const table = action === 'create_change' ? 'change_request' : 'incident';
    if (action === 'close_incident') {
      const res = await axios.patch(
        `${base}/api/now/table/incident/${sysId}`,
        { state: '7', close_code: payload.closeCode || 'Solved (Permanently)', close_notes: payload.closeNotes || 'Closed by OpsEdge360' },
        ax,
      );
      if (res.status >= 300) throw new BadRequestException(`ServiceNow close failed: ${res.status}`);
      return { externalId: sysId, response: res.data?.result };
    }
    const patchBody: Record<string, unknown> = { correlation_id: corr };
    if (payload.fields && typeof payload.fields === 'object' && !Array.isArray(payload.fields)) {
      Object.assign(patchBody, payload.fields as Record<string, unknown>);
    }
    const res = await axios.patch(`${base}/api/now/table/${table}/${sysId}`, patchBody, ax);
    if (res.status >= 300) throw new BadRequestException(`ServiceNow update failed: ${res.status}`);
    return { externalId: sysId, response: res.data?.result };
  }

  private async jiraAction(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    action: string,
    payload: Record<string, unknown>,
    corr: string,
  ) {
    const base = String(config.baseUrl || '').replace(/\/$/, '');
    if (!base) throw new BadRequestException('Jira baseUrl required');
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Correlation-Id': corr,
      ...this.authHeader(secrets, config),
    };
    const ax: AxiosRequestConfig = { headers, timeout: Number(config.timeoutMs ?? 15000), validateStatus: () => true };

    if (action === 'create_ticket' || action === 'create_incident') {
      const projectKey = String(payload.projectKey || config.projectKey || '');
      if (!projectKey) throw new BadRequestException('projectKey required');
      const res = await axios.post(
        `${base}/rest/api/3/issue`,
        {
          fields: {
            project: { key: projectKey },
            summary: payload.summary || payload.shortDescription || 'OpsEdge360 ticket',
            description: {
              type: 'doc',
              version: 1,
              content: [{ type: 'paragraph', content: [{ type: 'text', text: String(payload.description || corr) }] }],
            },
            issuetype: { name: String(payload.issueType || 'Task') },
            labels: ['opsedge360', corr],
          },
        },
        ax,
      );
      if (res.status >= 300) throw new BadRequestException(`Jira create failed: ${res.status}`);
      return { externalId: String(res.data?.key || res.data?.id || ''), response: res.data };
    }
    const key = String(payload.issueKey || payload.externalId || '');
    if (!key) throw new BadRequestException('issueKey required');
    if (action === 'sync_status') {
      const res = await axios.get(`${base}/rest/api/3/issue/${key}?fields=status`, ax);
      if (res.status >= 300) throw new BadRequestException(`Jira status sync failed: ${res.status}`);
      return { externalId: key, response: { status: res.data?.fields?.status } };
    }
    if (action === 'update_ticket' || action === 'update_incident') {
      const res = await axios.put(
        `${base}/rest/api/3/issue/${key}`,
        { fields: { ...(payload.fields as object), labels: ['opsedge360', corr] } },
        ax,
      );
      if (res.status >= 300) throw new BadRequestException(`Jira update failed: ${res.status}`);
      return { externalId: key, response: { updated: true } };
    }
    throw new BadRequestException(`Unsupported Jira action: ${action}`);
  }

  // --- Notifications ---
  async listNotificationChannels(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const channels = await query(
      `SELECT id, tenant_id, name, channel_type, config, secret_ref IS NOT NULL AS has_secret_ref,
              severity_routes, template, enabled, rate_limit_per_min, created_at, updated_at
       FROM enterprise_notification_channels WHERE tenant_id=$1 ORDER BY created_at DESC`,
      [tid],
    );
    return { channels };
  }

  async createNotificationChannel(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      name: string;
      channelType: 'email' | 'slack' | 'teams' | 'webhook';
      config?: Record<string, unknown>;
      secretRef?: string;
      severityRoutes?: string[];
      template?: Record<string, unknown>;
      rateLimitPerMin?: number;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.name || !body.channelType) throw new BadRequestException('name and channelType required');
    const row = await queryOne(
      `INSERT INTO enterprise_notification_channels
         (tenant_id, name, channel_type, config, secret_ref, severity_routes, template, rate_limit_per_min)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7::jsonb,$8)
       RETURNING *`,
      [
        tid,
        body.name,
        body.channelType,
        JSON.stringify(stripSecrets(body.config ?? {})),
        body.secretRef ?? null,
        JSON.stringify(body.severityRoutes ?? ['critical', 'high', 'medium', 'low', 'info']),
        JSON.stringify(body.template ?? { subject: '{{severity}}: {{title}}', body: '{{message}}' }),
        body.rateLimitPerMin ?? 60,
      ],
    );
    await this.audit(tid, user.sub, 'notification.channel.created', undefined, { id: row?.id, type: body.channelType });
    return row;
  }

  async deliverNotification(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { channelId: string; severity?: string; title?: string; message?: string; data?: Record<string, unknown> },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const channel = await queryOne<Record<string, unknown>>(
      `SELECT * FROM enterprise_notification_channels WHERE id=$1 AND tenant_id=$2 AND enabled=true`,
      [body.channelId, tid],
    );
    if (!channel) throw new NotFoundException('Channel not found');
    const severity = body.severity ?? 'info';
    const routes = (channel.severity_routes as string[]) || [];
    if (routes.length && !routes.includes(severity)) {
      throw new BadRequestException(`Severity ${severity} not routed to this channel`);
    }
    const rlKey = `notify:${tid}:${channel.id}`;
    if (!rateLimitOk(rlKey, Number(channel.rate_limit_per_min ?? 60))) {
      throw new BadRequestException('Notification rate limit exceeded');
    }

    const delivery = await queryOne<{ id: string }>(
      `INSERT INTO enterprise_notification_deliveries
         (tenant_id, channel_id, severity, subject, payload, status)
       VALUES ($1,$2,$3,$4,$5::jsonb,'queued') RETURNING id`,
      [
        tid,
        body.channelId,
        severity,
        body.title ?? 'OpsEdge360 notification',
        JSON.stringify({ title: body.title, message: body.message, data: body.data ?? {} }),
      ],
    );

    const secrets = await this.revealSecret(tid, channel.secret_ref as string | null);
    const config = (channel.config ?? {}) as Record<string, unknown>;
    const tmpl = (channel.template ?? {}) as Record<string, string>;
    const vars = { severity, title: body.title, message: body.message, ...(body.data ?? {}) };
    const subject = renderTemplate(tmpl.subject || '{{title}}', vars);
    const text = renderTemplate(tmpl.body || '{{message}}', vars);

    let attempts = 0;
    let lastError: string | undefined;
    let providerResponse: unknown = {};
    const maxAttempts = 3;
    for (let i = 1; i <= maxAttempts; i++) {
      attempts = i;
      await query(`UPDATE enterprise_notification_deliveries SET status='sending', attempts=$2 WHERE id=$1`, [
        delivery!.id,
        attempts,
      ]);
      try {
        providerResponse = await this.sendNotification(String(channel.channel_type), config, secrets, subject, text, severity);
        await query(
          `UPDATE enterprise_notification_deliveries
           SET status='delivered', delivered_at=NOW(), provider_response=$2::jsonb, last_error=NULL
           WHERE id=$1`,
          [delivery!.id, JSON.stringify(providerResponse)],
        );
        await this.audit(tid, user.sub, 'notification.delivered', undefined, { deliveryId: delivery!.id, attempts });
        return { deliveryId: delivery!.id, status: 'delivered', attempts, providerResponse };
      } catch (e) {
        lastError = (e as Error).message;
        if (i < maxAttempts) await new Promise((r) => setTimeout(r, 500 * i));
      }
    }
    await query(
      `UPDATE enterprise_notification_deliveries
       SET status='dead_letter', last_error=$2, provider_response=$3::jsonb WHERE id=$1`,
      [delivery!.id, lastError ?? 'failed', JSON.stringify(providerResponse)],
    );
    await this.audit(tid, user.sub, 'notification.dead_letter', undefined, { deliveryId: delivery!.id, error: lastError });
    return { deliveryId: delivery!.id, status: 'dead_letter', attempts, error: lastError };
  }

  private async sendNotification(
    type: string,
    config: Record<string, unknown>,
    secrets: Record<string, string>,
    subject: string,
    text: string,
    severity: string,
  ) {
    if (type === 'webhook' || type === 'slack' || type === 'teams') {
      const url = String(config.webhookUrl || config.url || '');
      if (!url) throw new Error('webhookUrl required');
      const payload =
        type === 'slack'
          ? { text: `*[${severity}]* ${subject}\n${text}` }
          : type === 'teams'
            ? {
                '@type': 'MessageCard',
                summary: subject,
                themeColor: severity === 'critical' ? 'FF0000' : '0078D7',
                sections: [{ activityTitle: subject, text }],
              }
            : { severity, subject, message: text, source: 'opsedge360' };
      const body = JSON.stringify(payload);
      const ts = String(Math.floor(Date.now() / 1000));
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const signSecret = secrets.signingSecret || secrets.token;
      if (signSecret) {
        headers['X-OpsEdge-Signature'] = signWebhookPayload(signSecret, body, ts);
        headers['X-OpsEdge-Timestamp'] = ts;
      }
      const res = await axios.post(url, body, {
        headers,
        timeout: 10000,
        validateStatus: () => true,
        transformRequest: [(d) => d],
      });
      if (res.status >= 300) throw new Error(`webhook_status_${res.status}`);
      return { status: res.status };
    }
    if (type === 'email') {
      const apiUrl = String(config.apiUrl || '');
      if (!apiUrl) throw new Error('email apiUrl required for delivery');
      const res = await axios.post(
        apiUrl,
        {
          to: config.to,
          from: config.from,
          subject,
          text,
        },
        { headers: { 'Content-Type': 'application/json', ...this.authHeader(secrets, config) }, timeout: 10000, validateStatus: () => true },
      );
      if (res.status >= 300) throw new Error(`email_status_${res.status}`);
      return { status: res.status };
    }
    throw new Error(`unsupported_channel:${type}`);
  }

  async listDeliveries(tenantId: string | undefined, user: JwtPayload, status?: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const rows = status
      ? await query(
          `SELECT * FROM enterprise_notification_deliveries WHERE tenant_id=$1 AND status=$2 ORDER BY created_at DESC LIMIT 100`,
          [tid, status],
        )
      : await query(
          `SELECT * FROM enterprise_notification_deliveries WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100`,
          [tid],
        );
    return { deliveries: rows };
  }

  // --- Identity ---
  async listIdentityProviders(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const providers = await query(
      `SELECT id, tenant_id, name, protocol, enabled, config, secret_ref IS NOT NULL AS has_secret_ref,
              role_mapping, attribute_mapping, group_mapping, jit_provisioning, sso_provider_id,
              last_sync_at, created_at, updated_at
       FROM identity_providers WHERE tenant_id=$1 ORDER BY name`,
      [tid],
    );
    return { providers };
  }

  async upsertIdentityProvider(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      id?: string;
      name: string;
      protocol: 'ldap' | 'active_directory' | 'saml' | 'oidc';
      config?: Record<string, unknown>;
      secretRef?: string;
      roleMapping?: Record<string, unknown>;
      attributeMapping?: Record<string, unknown>;
      groupMapping?: Record<string, unknown>;
      jitProvisioning?: boolean;
      ssoProviderId?: string;
      enabled?: boolean;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.name || !body.protocol) throw new BadRequestException('name and protocol required');
    const cfg = stripSecrets(body.config ?? {});
    // Never accept passwords in config
    delete (cfg as { bindPassword?: string }).bindPassword;
    delete (cfg as { password?: string }).password;

    if (body.protocol === 'saml' || body.protocol === 'oidc') {
      // Link or ensure SSO provider metadata exists without storing secrets in sso_providers when secretRef provided
      if (!body.ssoProviderId && (cfg.issuer || cfg.entryPoint)) {
        const sso = await queryOne<{ id: string }>(
          `INSERT INTO sso_providers (tenant_id, name, protocol, enabled, issuer, client_id, entry_point, idp_entity_id, idp_cert, client_secret)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL)
           ON CONFLICT (tenant_id, name) DO UPDATE SET
             protocol=EXCLUDED.protocol, issuer=COALESCE(EXCLUDED.issuer,sso_providers.issuer),
             entry_point=COALESCE(EXCLUDED.entry_point,sso_providers.entry_point), updated_at=NOW()
           RETURNING id`,
          [
            tid,
            body.name,
            body.protocol,
            body.enabled ?? true,
            cfg.issuer ?? null,
            cfg.clientId ?? null,
            cfg.entryPoint ?? null,
            cfg.idpEntityId ?? null,
            cfg.idpCert ?? null,
          ],
        );
        body.ssoProviderId = sso?.id;
      }
    }

    if (body.id) {
      const row = await queryOne(
        `UPDATE identity_providers SET
           name=$3, protocol=$4, config=$5::jsonb, secret_ref=COALESCE($6, secret_ref),
           role_mapping=COALESCE($7::jsonb, role_mapping), attribute_mapping=COALESCE($8::jsonb, attribute_mapping),
           group_mapping=COALESCE($9::jsonb, group_mapping), jit_provisioning=COALESCE($10, jit_provisioning),
           sso_provider_id=COALESCE($11, sso_provider_id), enabled=COALESCE($12, enabled), updated_at=NOW()
         WHERE id=$1 AND tenant_id=$2 RETURNING *`,
        [
          body.id,
          tid,
          body.name,
          body.protocol,
          JSON.stringify(cfg),
          body.secretRef ?? null,
          body.roleMapping ? JSON.stringify(body.roleMapping) : null,
          body.attributeMapping ? JSON.stringify(body.attributeMapping) : null,
          body.groupMapping ? JSON.stringify(body.groupMapping) : null,
          body.jitProvisioning ?? null,
          body.ssoProviderId ?? null,
          body.enabled ?? null,
        ],
      );
      if (!row) throw new NotFoundException('Identity provider not found');
      await this.audit(tid, user.sub, 'identity.provider.updated', undefined, { id: body.id });
      return row;
    }

    const row = await queryOne(
      `INSERT INTO identity_providers
         (tenant_id, name, protocol, config, secret_ref, role_mapping, attribute_mapping, group_mapping,
          jit_provisioning, sso_provider_id, enabled)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11)
       RETURNING *`,
      [
        tid,
        body.name,
        body.protocol,
        JSON.stringify(cfg),
        body.secretRef ?? null,
        JSON.stringify(body.roleMapping ?? {}),
        JSON.stringify(body.attributeMapping ?? {}),
        JSON.stringify(body.groupMapping ?? {}),
        body.jitProvisioning ?? true,
        body.ssoProviderId ?? null,
        body.enabled ?? true,
      ],
    );
    await this.audit(tid, user.sub, 'identity.provider.created', undefined, { id: row?.id, protocol: body.protocol });
    return row;
  }

  async syncIdentity(tenantId: string | undefined, user: JwtPayload, providerId: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const provider = await queryOne<Record<string, unknown>>(
      `SELECT * FROM identity_providers WHERE id=$1 AND tenant_id=$2 AND enabled=true`,
      [providerId, tid],
    );
    if (!provider) throw new NotFoundException('Identity provider not found');
    const job = await queryOne<{ id: string }>(
      `INSERT INTO identity_sync_jobs (tenant_id, provider_id, job_type, status)
       VALUES ($1,$2,'users','running') RETURNING id`,
      [tid, providerId],
    );

    const protocol = String(provider.protocol);
    let usersSynced = 0;
    let groupsSynced = 0;
    try {
      if (protocol === 'ldap' || protocol === 'active_directory') {
        const config = (provider.config ?? {}) as Record<string, unknown>;
        const secrets = await this.revealSecret(tid, provider.secret_ref as string | null);
        const search = await ldapSearchUsers({
          host: String(config.host || ''),
          port: config.port ? Number(config.port) : undefined,
          useTls: !!config.useTls,
          bindDn: String(config.bindDn || ''),
          bindPassword: secrets.password || secrets.bindPassword || '',
          baseDn: String(config.baseDn || config.userBaseDn || ''),
          filter: String(config.userFilter || '(objectClass=person)'),
        });
        if (!search.ok) throw new Error(search.error || 'ldap_search_failed');
        usersSynced = search.entries.length;
        groupsSynced = 0;
      } else if (protocol === 'oidc' || protocol === 'saml') {
        // Metadata sync only — live user sync via SSO JIT
        usersSynced = 0;
        groupsSynced = 0;
      }
      await query(
        `UPDATE identity_sync_jobs SET status='completed', users_synced=$2, groups_synced=$3, completed_at=NOW(), detail=$4::jsonb
         WHERE id=$1`,
        [job!.id, usersSynced, groupsSynced, JSON.stringify({ protocol })],
      );
      await query(`UPDATE identity_providers SET last_sync_at=NOW(), updated_at=NOW() WHERE id=$1`, [providerId]);
      await this.audit(tid, user.sub, 'identity.sync.completed', undefined, { providerId, usersSynced, groupsSynced });
      return { jobId: job!.id, status: 'completed', usersSynced, groupsSynced };
    } catch (e) {
      await query(
        `UPDATE identity_sync_jobs SET status='failed', error=$2, completed_at=NOW() WHERE id=$1`,
        [job!.id, (e as Error).message],
      );
      await this.audit(tid, user.sub, 'identity.sync.failed', undefined, { providerId, error: (e as Error).message });
      throw new BadRequestException((e as Error).message);
    }
  }

  async ldapLogin(
    tenantId: string | undefined,
    body: { providerId: string; username: string; password: string },
  ) {
    // Public-ish via controller; tenant from JWT or slug resolution — here require tenant context from auth wrapper
    if (!tenantId) throw new BadRequestException('Tenant context required');
    if (!body.username || !body.password) throw new UnauthorizedException('Credentials required');
    const provider = await queryOne<Record<string, unknown>>(
      `SELECT * FROM identity_providers WHERE id=$1 AND tenant_id=$2 AND enabled=true
       AND protocol IN ('ldap','active_directory')`,
      [body.providerId, tenantId],
    );
    if (!provider) throw new NotFoundException('LDAP provider not found');
    const config = (provider.config ?? {}) as Record<string, unknown>;
    const secrets = await this.revealSecret(tenantId, provider.secret_ref as string | null);
    // User bind: either direct DN pattern or service bind + search (service account from secret)
    const userDnTemplate = String(config.userDnTemplate || '');
    let bindDn = '';
    let bindPassword = body.password;
    if (userDnTemplate) {
      bindDn = userDnTemplate.replace('{username}', body.username);
    } else {
      // Validate password against directory by binding as user after finding DN via service account
      const svc = await ldapTestBind({
        host: String(config.host || ''),
        port: config.port ? Number(config.port) : undefined,
        useTls: !!config.useTls,
        bindDn: String(config.bindDn || ''),
        bindPassword: secrets.password || secrets.bindPassword || '',
      });
      if (!svc.ok) throw new UnauthorizedException('Directory unavailable');
      bindDn = String(config.userDnTemplate || `uid=${body.username},${config.userBaseDn || config.baseDn || ''}`);
    }
    const bind = await ldapTestBind({
      host: String(config.host || ''),
      port: config.port ? Number(config.port) : undefined,
      useTls: !!config.useTls,
      bindDn,
      bindPassword,
    });
    if (!bind.ok) throw new UnauthorizedException('Invalid credentials');

    // Never store the password — JIT provision with NULL password_hash
    const emailDomain = String(config.emailDomain || 'ldap.local');
    const email = body.username.includes('@') ? body.username : `${body.username}@${emailDomain}`;
    const roleMapping = (provider.role_mapping as Record<string, string>) || {};
    const role = roleMapping.default || 'operator';
    const tenant = await queryOne<{ slug: string }>(`SELECT slug FROM tenants WHERE id=$1`, [tenantId]);
    if (!tenant) throw new BadRequestException('Tenant missing');

    if (provider.jit_provisioning !== false) {
      return this.auth.issueSsoToken({
        tenantSlug: tenant.slug,
        email,
        name: body.username,
        subject: `ldap:${body.username}`,
        providerId: 'env',
      });
    }
    const user = await queryOne(
      `SELECT u.id, u.tenant_id, u.email, u.name, u.role, u.password_hash, t.slug
       FROM users u JOIN tenants t ON t.id=u.tenant_id
       WHERE u.tenant_id=$1 AND u.email=$2`,
      [tenantId, email],
    );
    if (!user) throw new UnauthorizedException('User not provisioned');
    void role;
    return this.auth.issueSsoToken({
      tenantSlug: tenant.slug,
      email,
      name: String((user as { name?: string }).name || body.username),
      subject: `ldap:${body.username}`,
      providerId: 'env',
    });
  }

  async listSyncJobs(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const jobs = await query(
      `SELECT * FROM identity_sync_jobs WHERE tenant_id=$1 ORDER BY started_at DESC LIMIT 50`,
      [tid],
    );
    return { jobs };
  }

  async validateSecretRef(tenantId: string | undefined, user: JwtPayload, secretRef: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const meta = await this.secrets.getMetadata(tid, secretRef).catch(() => null);
    if (!meta) return { valid: false, reason: 'not_found' };
    const expired = meta.expires_at ? new Date(meta.expires_at) < new Date() : false;
    return {
      valid: meta.status === 'active' && !expired,
      status: meta.status,
      expiresAt: meta.expires_at ?? null,
      expired,
      name: meta.name,
      currentVersion: meta.current_version,
    };
  }

  async listAudit(tenantId: string | undefined, user: JwtPayload, q?: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const events = q
      ? await query(
          `SELECT * FROM connector_audit WHERE tenant_id=$1 AND (action ILIKE $2 OR detail::text ILIKE $2)
           ORDER BY created_at DESC LIMIT 100`,
          [tid, `%${q}%`],
        )
      : await query(`SELECT * FROM connector_audit WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100`, [tid]);
    return { events };
  }
}
