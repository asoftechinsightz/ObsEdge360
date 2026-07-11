import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { query, queryOne } from '@opsedge360/shared-db';
import type { JwtPayload } from '../auth/auth.service';

function requireAdmin(user: JwtPayload) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
}

function requireTenant(tenantId?: string): string {
  if (!tenantId) throw new BadRequestException('Tenant context required');
  return tenantId;
}

const QUOTA_RESOURCES = [
  'agents',
  'configuration_items',
  'dashboards',
  'ai_conversations',
  'rag_chunks',
  'kg_entities',
  'api_requests',
  'discovery_jobs',
  'storage_mb',
  'concurrent_users',
  'users',
] as const;

@Injectable()
export class GovernanceService {
  async audit(
    tenantId: string | null | undefined,
    actorId: string | undefined,
    action: string,
    resourceType?: string,
    resourceId?: string,
    detail?: Record<string, unknown>,
  ) {
    await query(
      `INSERT INTO governance_audit_events (tenant_id, actor_id, action, resource_type, resource_id, detail)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        tenantId ?? null,
        actorId ?? null,
        action,
        resourceType ?? null,
        resourceId ?? null,
        JSON.stringify(detail ?? {}),
      ],
    );
  }

  async getPlatformOverview(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const health = await this.getPlatformHealth(tid, user);
    const quotas = await this.evaluateQuotas(tid, user);
    const license = await this.getLicenseStatus(tid, user);
    return {
      wave: 'v1.0.0-wave3',
      gaClaim: false,
      tenantId: tid,
      health,
      quotas: { warnings: quotas.warnings, breachedHard: quotas.breachedHard },
      license,
      checkedAt: new Date().toISOString(),
    };
  }

  async listSettingsExpanded(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const rows = await query(
      `SELECT setting_key, setting_value, updated_at FROM platform_admin_settings WHERE tenant_id = $1 ORDER BY setting_key`,
      [tid],
    );
    const defaults = {
      general: { timezone: 'UTC', region: 'ap-south-1' },
      platform: {
        telemetryRetentionDays: 30,
        discoveryScheduleCron: '0 */6 * * *',
        cmdbRetentionDays: 365,
        auditRetentionDays: 365,
      },
      ai: {
        llmProvider: 'gateway',
        model: 'default',
        tokenBudgetDaily: 100000,
        conversationRetentionDays: 90,
        copilotEnabled: true,
      },
      notifications: {
        email: { configured: false },
        webhook: { configured: false },
        slack: { configured: false, delivery: 'config_only' },
        teams: { configured: false, delivery: 'config_only' },
      },
    };
    const byKey: Record<string, unknown> = {};
    for (const r of rows as Array<{ setting_key: string; setting_value: unknown }>) {
      byKey[r.setting_key] = r.setting_value;
    }
    return { settings: rows, effective: { ...defaults, ...byKey }, defaults };
  }

  async putSettingGroup(
    tenantId: string | undefined,
    user: JwtPayload,
    group: string,
    value: Record<string, unknown>,
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const allowed = ['general', 'platform', 'ai', 'notifications'];
    if (!allowed.includes(group)) throw new BadRequestException('invalid settings group');
    const row = await queryOne(
      `INSERT INTO platform_admin_settings (tenant_id, setting_key, setting_value, updated_by, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW())
       ON CONFLICT (tenant_id, setting_key) DO UPDATE SET
         setting_value = EXCLUDED.setting_value,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING setting_key, setting_value, updated_at`,
      [tid, group, JSON.stringify(value ?? {}), user.sub],
    );
    await this.audit(tid, user.sub, 'settings.update', 'platform_admin_settings', group, value);
    return row;
  }

  private async usageCounts(tenantId: string) {
    const users = await queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM users WHERE tenant_id = $1`, [tenantId]);
    const cis = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM configuration_items WHERE tenant_id = $1`,
      [tenantId],
    );
    const agents = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM information_schema.tables WHERE table_name = 'universal_agents'`,
    ).catch(() => ({ c: '0' }));
    let agentCount = 0;
    if (Number(agents?.c ?? 0) > 0) {
      const a = await queryOne<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM universal_agents WHERE tenant_id = $1`,
        [tenantId],
      ).catch(() => ({ c: '0' }));
      agentCount = Number(a?.c ?? 0);
    }
    const dashboards = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM ops_dashboards WHERE tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ c: '0' }));
    const conv = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM ai_conversation_sessions WHERE tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ c: '0' }));
    const rag = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM ai_rag_chunks WHERE tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ c: '0' }));
    const kg = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM kg_entities WHERE tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ c: '0' }));
    const jobs = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM discovery_jobs WHERE tenant_id = $1`,
      [tenantId],
    ).catch(() => ({ c: '0' }));
    const sessions = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM user_sessions WHERE tenant_id = $1 AND revoked_at IS NULL`,
      [tenantId],
    ).catch(() => ({ c: '0' }));

    return {
      users: Number(users?.c ?? 0),
      configuration_items: Number(cis?.c ?? 0),
      agents: agentCount,
      dashboards: Number(dashboards?.c ?? 0),
      ai_conversations: Number(conv?.c ?? 0),
      rag_chunks: Number(rag?.c ?? 0),
      kg_entities: Number(kg?.c ?? 0),
      discovery_jobs: Number(jobs?.c ?? 0),
      concurrent_users: Number(sessions?.c ?? 0),
      api_requests: 0,
      storage_mb: 0,
    };
  }

  async listQuotas(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const rows = await query(`SELECT * FROM platform_quotas WHERE tenant_id = $1 ORDER BY resource_key`, [tid]);
    return { quotas: rows, resources: QUOTA_RESOURCES };
  }

  async upsertQuotaResource(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { resourceKey: string; softLimit?: number; hardLimit?: number; warnPct?: number; enabled?: boolean },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.resourceKey) throw new BadRequestException('resourceKey required');
    if (body.softLimit != null && body.hardLimit != null && body.softLimit > body.hardLimit) {
      throw new BadRequestException('softLimit cannot exceed hardLimit');
    }
    const row = await queryOne(
      `INSERT INTO platform_quotas (tenant_id, resource_key, soft_limit, hard_limit, warn_pct, enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (tenant_id, resource_key) DO UPDATE SET
         soft_limit = COALESCE(EXCLUDED.soft_limit, platform_quotas.soft_limit),
         hard_limit = COALESCE(EXCLUDED.hard_limit, platform_quotas.hard_limit),
         warn_pct = COALESCE(EXCLUDED.warn_pct, platform_quotas.warn_pct),
         enabled = COALESCE(EXCLUDED.enabled, platform_quotas.enabled),
         updated_at = NOW()
       RETURNING *`,
      [
        tid,
        body.resourceKey,
        body.softLimit ?? null,
        body.hardLimit ?? null,
        body.warnPct ?? 80,
        body.enabled ?? true,
      ],
    );
    await this.audit(tid, user.sub, 'quotas.update', 'platform_quotas', body.resourceKey, body as unknown as Record<string, unknown>);
    return row;
  }

  async evaluateQuotas(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const usage = await this.usageCounts(tid);
    const quotas = await query<{
      resource_key: string;
      soft_limit: string | null;
      hard_limit: string | null;
      warn_pct: number;
      enabled: boolean;
    }>(`SELECT * FROM platform_quotas WHERE tenant_id = $1 AND enabled = true`, [tid]);

    const warnings: Array<Record<string, unknown>> = [];
    const breachedHard: Array<Record<string, unknown>> = [];
    const items = quotas.map((q) => {
      const used = Number((usage as Record<string, number>)[q.resource_key] ?? 0);
      const soft = q.soft_limit != null ? Number(q.soft_limit) : null;
      const hard = q.hard_limit != null ? Number(q.hard_limit) : null;
      const warnPct = q.warn_pct ?? 80;
      let level: 'ok' | 'warn' | 'soft' | 'hard' = 'ok';
      if (hard != null && used >= hard) {
        level = 'hard';
        breachedHard.push({ resource: q.resource_key, used, hard });
      } else if (soft != null && used >= soft) {
        level = 'soft';
        warnings.push({ resource: q.resource_key, used, soft, message: 'Soft limit reached' });
      } else if (hard != null && used >= (hard * warnPct) / 100) {
        level = 'warn';
        warnings.push({ resource: q.resource_key, used, hard, warnPct, message: 'Approaching hard limit' });
      } else if (soft != null && used >= (soft * warnPct) / 100) {
        level = 'warn';
        warnings.push({ resource: q.resource_key, used, soft, warnPct, message: 'Approaching soft limit' });
      }
      return { resource: q.resource_key, used, soft, hard, warnPct, level };
    });

    return { usage, items, warnings, breachedHard };
  }

  async assertHardQuota(tenantId: string, resourceKey: string) {
    const q = await queryOne<{ hard_limit: string | null; enabled: boolean }>(
      `SELECT hard_limit, enabled FROM platform_quotas WHERE tenant_id = $1 AND resource_key = $2`,
      [tenantId, resourceKey],
    );
    if (!q?.enabled || q.hard_limit == null) return;
    const usage = await this.usageCounts(tenantId);
    const used = Number((usage as Record<string, number>)[resourceKey] ?? 0);
    if (used >= Number(q.hard_limit)) {
      throw new ForbiddenException(`Hard quota exceeded for ${resourceKey}`);
    }
  }

  async getCapacity(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const dbSize = await queryOne<{ bytes: string }>(
      `SELECT pg_database_size(current_database())::text AS bytes`,
    );
    const tableStats = await query<{ relname: string; n_live_tup: string }>(
      `SELECT relname, n_live_tup::text
       FROM pg_stat_user_tables
       WHERE relname IN ('configuration_items','kg_entities','ai_rag_chunks','ops_incidents','audit_logs')
       ORDER BY n_live_tup DESC`,
    ).catch(() => []);
    const metrics = {
      databaseBytes: Number(dbSize?.bytes ?? 0),
      databaseMb: Math.round(Number(dbSize?.bytes ?? 0) / (1024 * 1024)),
      tables: tableStats,
      kafka: { status: process.env.KAFKA_BROKERS ? 'configured' : 'optional', note: 'Broker disk is host-managed' },
      redis: { status: process.env.REDIS_URL ? 'configured' : 'memory_fallback' },
      projectedExhaustionDays: null as number | null,
      note: 'Projection improves with scheduled snapshots over time',
    };
    const score = metrics.databaseMb < 10240 ? 90 : metrics.databaseMb < 51200 ? 70 : 50;
    await query(
      `INSERT INTO capacity_snapshots (tenant_id, scope, metrics, score) VALUES ($1, 'tenant', $2::jsonb, $3)`,
      [tid, JSON.stringify(metrics), score],
    );
    const history = await query(
      `SELECT id, score, metrics, created_at FROM capacity_snapshots WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [tid],
    );
    return { metrics, score, history };
  }

  async getStorage(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const rag = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM ai_rag_chunks WHERE tenant_id = $1`,
      [tid],
    ).catch(() => ({ c: '0' }));
    const kg = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM kg_entities WHERE tenant_id = $1`,
      [tid],
    ).catch(() => ({ c: '0' }));
    const backups = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM backup_runs WHERE tenant_id = $1 OR tenant_id IS NULL`,
      [tid],
    );
    const metrics = {
      ragChunks: Number(rag?.c ?? 0),
      kgEntities: Number(kg?.c ?? 0),
      backupRuns: Number(backups?.c ?? 0),
      uploadedDocuments: Number(rag?.c ?? 0),
      telemetryRetention: 'see platform settings',
      discoveryGrowth: 'tracked via capacity snapshots',
    };
    const score = 85;
    await query(
      `INSERT INTO storage_snapshots (tenant_id, scope, metrics, score) VALUES ($1, 'tenant', $2::jsonb, $3)`,
      [tid, JSON.stringify(metrics), score],
    );
    const history = await query(
      `SELECT id, score, metrics, created_at FROM storage_snapshots WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [tid],
    );
    return { metrics, score, history };
  }

  async getSecurityPolicies(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const policies = await query(
      `SELECT policy_type, config, updated_at FROM security_policies WHERE tenant_id = $1 ORDER BY policy_type`,
      [tid],
    );
    return { policies };
  }

  async putSecurityPolicy(
    tenantId: string | undefined,
    user: JwtPayload,
    policyType: string,
    config: Record<string, unknown>,
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!['password', 'session'].includes(policyType)) {
      throw new BadRequestException('policyType must be password or session');
    }
    const row = await queryOne(
      `INSERT INTO security_policies (tenant_id, policy_type, config, updated_by, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW())
       ON CONFLICT (tenant_id, policy_type) DO UPDATE SET
         config = EXCLUDED.config,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING policy_type, config, updated_at`,
      [tid, policyType, JSON.stringify(config ?? {}), user.sub],
    );
    await this.audit(tid, user.sub, 'security_policy.update', 'security_policies', policyType, config);
    return row;
  }

  async getPasswordPolicyForTenant(tenantId: string) {
    const row = await queryOne<{ config: Record<string, unknown> }>(
      `SELECT config FROM security_policies WHERE tenant_id = $1 AND policy_type = 'password'`,
      [tenantId],
    );
    return (
      row?.config ?? {
        minLength: 8,
        requireComplexity: false,
        maxFailedAttempts: 5,
        lockoutMinutes: 15,
        historyCount: 0,
      }
    );
  }

  validatePasswordAgainstPolicy(password: string, policy: Record<string, unknown>) {
    const minLength = Number(policy.minLength ?? 8);
    if (password.length < minLength) {
      throw new BadRequestException(`Password must be at least ${minLength} characters`);
    }
    if (policy.requireComplexity) {
      const ok =
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password);
      if (!ok) {
        throw new BadRequestException('Password must include upper, lower, number, and special character');
      }
    }
  }

  async getLicenseStatus(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const licenses = await query<{
      id: string;
      license_tier: string;
      seats: number | null;
      valid_until: string | null;
      status: string;
      features: Record<string, unknown>;
    }>(
      `SELECT id, license_tier, seats, valid_until, status, features
       FROM platform_licenses WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tid],
    );
    const now = Date.now();
    const enriched = licenses.map((l) => {
      const until = l.valid_until ? new Date(l.valid_until).getTime() : null;
      let lifecycle: 'active' | 'grace' | 'expired' | 'unlimited' = 'unlimited';
      if (until != null) {
        const graceMs = 7 * 24 * 3600 * 1000;
        if (now <= until) lifecycle = 'active';
        else if (now <= until + graceMs) lifecycle = 'grace';
        else lifecycle = 'expired';
      }
      return {
        ...l,
        lifecycle,
        disruptWorkload: false,
        note:
          lifecycle === 'expired'
            ? 'Expired — new entitlements blocked; existing workloads continue (Wave 3 policy)'
            : lifecycle === 'grace'
              ? 'In grace period — renew soon'
              : 'OK',
      };
    });
    const primary = enriched[0] ?? null;
    return { licenses: enriched, primary, enforcement: 'non_disruptive' };
  }

  async getPlatformHealth(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const db = await queryOne<{ ok: number }>(`SELECT 1 AS ok`);
    const capacity = await this.getCapacity(tid, user);
    const storage = await this.getStorage(tid, user);
    const quotas = await this.evaluateQuotas(tid, user);
    const license = await this.getLicenseStatus(tid, user);
    const componentScore = db?.ok === 1 ? 95 : 20;
    const capacityScore = Number(capacity.score ?? 70);
    const storageScore = Number(storage.score ?? 70);
    const securityScore = 80;
    const licenseScore =
      license.primary?.lifecycle === 'expired' ? 40 : license.primary?.lifecycle === 'grace' ? 65 : 90;
    const quotaScore = quotas.breachedHard.length ? 40 : quotas.warnings.length ? 70 : 95;
    const overall = Math.round(
      (componentScore + capacityScore + storageScore + securityScore + licenseScore + quotaScore) / 6,
    );
    const recommendations: string[] = [];
    if (quotas.warnings.length) recommendations.push('Review quota warnings before hard limits block growth');
    if (license.primary?.lifecycle === 'grace') recommendations.push('Renew license before grace ends');
    if (capacityScore < 70) recommendations.push('Plan database capacity expansion');
    if (!recommendations.length) recommendations.push('Platform governance healthy for Wave 3 preview');

    return {
      overallScore: overall,
      componentStatus: db?.ok === 1 ? 'up' : 'down',
      capacityScore,
      storageScore,
      securityScore,
      licenseStatus: license.primary?.lifecycle ?? 'none',
      quotaUtilization: quotas.items,
      recommendations,
      gaClaim: false,
      wave: 'v1.0.0-wave3',
      prometheusHints: {
        quota_warnings: quotas.warnings.length,
        overall_score: overall,
        license_lifecycle: license.primary?.lifecycle ?? 'none',
      },
    };
  }

  async listGovernanceAudit(tenantId: string | undefined, user: JwtPayload, limit = 50) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const events = await query(
      `SELECT * FROM governance_audit_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [tid, Math.min(limit, 200)],
    );
    return { events };
  }

  async listSessions(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const sessions = await query(
      `SELECT id, user_id, device_label, ip_address, last_seen_at, expires_at, revoked_at, created_at
       FROM user_sessions WHERE tenant_id = $1 ORDER BY last_seen_at DESC LIMIT 100`,
      [tid],
    );
    return { sessions };
  }

  async revokeSession(tenantId: string | undefined, user: JwtPayload, sessionId: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const row = await queryOne(
      `UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, revoked_at`,
      [sessionId, tid],
    );
    await this.audit(tid, user.sub, 'session.revoke', 'user_sessions', sessionId, {});
    return row;
  }
}
