import { createHash } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
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

function hashLicenseKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class AdminService {
  async overview(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const tenant = await queryOne<{ id: string; name: string; slug: string; region: string; settings: unknown }>(
      `SELECT id, name, slug, region, settings FROM tenants WHERE id = $1`,
      [tid],
    );
    const users = await queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM users WHERE tenant_id = $1`, [tid]);
    const cis = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM configuration_items WHERE tenant_id = $1`,
      [tid],
    );
    const licenses = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM platform_licenses WHERE tenant_id = $1 AND status = 'active'`,
      [tid],
    );
    const policies = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM automation_policies WHERE tenant_id = $1 AND enabled = true`,
      [tid],
    );
    const emergency = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM automation_policies WHERE tenant_id = $1 AND emergency_stop = true`,
      [tid],
    );
    const backups = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM backup_runs WHERE tenant_id = $1 OR tenant_id IS NULL`,
      [tid],
    );
    return {
      tenant,
      counts: {
        users: Number(users?.c ?? 0),
        configurationItems: Number(cis?.c ?? 0),
        activeLicenses: Number(licenses?.c ?? 0),
        enabledPolicies: Number(policies?.c ?? 0),
        emergencyStoppedPolicies: Number(emergency?.c ?? 0),
        backupRuns: Number(backups?.c ?? 0),
      },
      gaClaim: false,
      releaseTrack: 'v1.0.0-wave1',
      note: 'Phase 5 Wave 1 preview — not Enterprise GA until P5_GA_VALIDATION_OK',
    };
  }

  async getOrganization(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const tenant = await queryOne(
      `SELECT id, name, slug, region, settings, created_at, updated_at FROM tenants WHERE id = $1`,
      [tid],
    );
    if (!tenant) throw new NotFoundException('Tenant not found');
    const users = await query(
      `SELECT id, email, name, role, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 200`,
      [tid],
    );
    const quota = await queryOne(`SELECT * FROM tenant_quotas WHERE tenant_id = $1`, [tid]);
    return { tenant, users, quota: quota ?? null };
  }

  async updateOrganization(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { name?: string; region?: string; settings?: Record<string, unknown> },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const row = await queryOne(
      `UPDATE tenants
       SET name = COALESCE($2, name),
           region = COALESCE($3, region),
           settings = CASE WHEN $4::jsonb IS NULL THEN settings ELSE COALESCE(settings, '{}'::jsonb) || $4::jsonb END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, slug, region, settings, updated_at`,
      [tid, body.name ?? null, body.region ?? null, body.settings ? JSON.stringify(body.settings) : null],
    );
    if (!row) throw new NotFoundException('Tenant not found');
    return row;
  }

  async upsertQuota(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      maxUsers?: number;
      maxAgents?: number;
      maxCis?: number;
      maxTelemetryPointsPerHour?: number;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return queryOne(
      `INSERT INTO tenant_quotas (tenant_id, max_users, max_agents, max_cis, max_telemetry_points_per_hour, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         max_users = COALESCE(EXCLUDED.max_users, tenant_quotas.max_users),
         max_agents = COALESCE(EXCLUDED.max_agents, tenant_quotas.max_agents),
         max_cis = COALESCE(EXCLUDED.max_cis, tenant_quotas.max_cis),
         max_telemetry_points_per_hour = COALESCE(EXCLUDED.max_telemetry_points_per_hour, tenant_quotas.max_telemetry_points_per_hour),
         updated_at = NOW()
       RETURNING *`,
      [
        tid,
        body.maxUsers ?? null,
        body.maxAgents ?? null,
        body.maxCis ?? null,
        body.maxTelemetryPointsPerHour ?? null,
      ],
    );
  }

  async listLicenses(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return query(
      `SELECT id, tenant_id, license_tier, seats, valid_from, valid_until, features, status, created_at, updated_at
       FROM platform_licenses WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tid],
    );
  }

  async createLicense(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { licenseKey: string; licenseTier?: string; seats?: number; validUntil?: string; features?: Record<string, unknown> },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.licenseKey || body.licenseKey.length < 8) {
      throw new BadRequestException('licenseKey must be at least 8 characters');
    }
    return queryOne(
      `INSERT INTO platform_licenses
         (tenant_id, license_key_hash, license_tier, seats, valid_until, features, status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'active')
       RETURNING id, tenant_id, license_tier, seats, valid_from, valid_until, features, status, created_at`,
      [
        tid,
        hashLicenseKey(body.licenseKey),
        body.licenseTier ?? 'enterprise',
        body.seats ?? null,
        body.validUntil ?? null,
        JSON.stringify(body.features ?? {}),
      ],
    );
  }

  async listSettings(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return query(
      `SELECT setting_key, setting_value, updated_at FROM platform_admin_settings WHERE tenant_id = $1 ORDER BY setting_key`,
      [tid],
    );
  }

  async upsertSetting(
    tenantId: string | undefined,
    user: JwtPayload,
    key: string,
    value: Record<string, unknown>,
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!key) throw new BadRequestException('setting key required');
    return queryOne(
      `INSERT INTO platform_admin_settings (tenant_id, setting_key, setting_value, updated_by, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW())
       ON CONFLICT (tenant_id, setting_key) DO UPDATE SET
         setting_value = EXCLUDED.setting_value,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING setting_key, setting_value, updated_at`,
      [tid, key, JSON.stringify(value ?? {}), user.sub],
    );
  }

  async systemHealth(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    requireTenant(tenantId);
    const db = await queryOne<{ ok: number }>(`SELECT 1 AS ok`);
    return {
      database: db?.ok === 1 ? 'up' : 'down',
      checkedAt: new Date().toISOString(),
      note: 'Gateway-side DB probe; full mesh health via GET /api/v1/health',
    };
  }

  async clusterHealth(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    requireTenant(tenantId);
    return {
      mode: process.env.DEPLOYMENT_MODE ?? 'onprem',
      performanceProfile: process.env.PERFORMANCE_PROFILE ?? 'standard',
      replicas: {
        claim: 'single-replica baseline (Wave 1)',
        haValidated: false,
      },
      guidance: 'See docs/architecture/HA.md — multi-node HA is Wave 2+',
      checkedAt: new Date().toISOString(),
    };
  }

  async listBackupRuns(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return query(
      `SELECT * FROM backup_runs WHERE tenant_id = $1 OR tenant_id IS NULL ORDER BY started_at DESC LIMIT 50`,
      [tid],
    );
  }

  async recordBackup(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { artifactPath?: string; notes?: string; status?: string; runType?: string },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return queryOne(
      `INSERT INTO backup_runs (tenant_id, run_type, status, artifact_path, notes, completed_at, created_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING *`,
      [
        tid,
        body.runType ?? 'manual',
        body.status ?? 'recorded',
        body.artifactPath ?? null,
        body.notes ?? 'Recorded via Admin Center; host script executes backup',
        user.sub,
      ],
    );
  }

  async listUpgradeRuns(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return query(
      `SELECT * FROM upgrade_runs WHERE tenant_id = $1 OR tenant_id IS NULL ORDER BY started_at DESC LIMIT 50`,
      [tid],
    );
  }

  async recordUpgrade(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { fromVersion?: string; toVersion?: string; notes?: string; status?: string },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return queryOne(
      `INSERT INTO upgrade_runs (tenant_id, from_version, to_version, status, notes, completed_at, created_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING *`,
      [
        tid,
        body.fromVersion ?? null,
        body.toVersion ?? 'v1.0.0-wave1',
        body.status ?? 'recorded',
        body.notes ?? 'Recorded via Admin Center; use scripts/upgrade-onprem.sh on host',
        user.sub,
      ],
    );
  }

  async listPolicies(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return query(
      `SELECT * FROM automation_policies WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tid],
    );
  }

  async createPolicy(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      name: string;
      policyType?: string;
      executionMode?: string;
      requireApproval?: boolean;
      emergencyStop?: boolean;
      safetyRules?: Record<string, unknown>;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.name) throw new BadRequestException('name required');
    const mode = body.executionMode ?? 'dry_run';
    if (!['dry_run', 'simulation', 'production'].includes(mode)) {
      throw new BadRequestException('invalid executionMode');
    }
    const requireApproval = body.requireApproval ?? true;
    if (mode === 'production' && !requireApproval) {
      throw new BadRequestException('production executionMode requires requireApproval=true');
    }
    return queryOne(
      `INSERT INTO automation_policies
         (tenant_id, name, policy_type, execution_mode, require_approval, emergency_stop, safety_rules)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING *`,
      [
        tid,
        body.name,
        body.policyType ?? 'remediation',
        mode,
        requireApproval,
        body.emergencyStop ?? false,
        JSON.stringify(body.safetyRules ?? {}),
      ],
    );
  }

  async setEmergencyStop(tenantId: string | undefined, user: JwtPayload, policyId: string, stop: boolean) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const row = await queryOne(
      `UPDATE automation_policies SET emergency_stop = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [policyId, tid, stop],
    );
    if (!row) throw new NotFoundException('Policy not found');
    return row;
  }

  async listRunbooks(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return query(`SELECT * FROM runbook_definitions WHERE tenant_id = $1 ORDER BY created_at DESC`, [tid]);
  }

  async createRunbook(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { name: string; description?: string; steps?: unknown[]; linkedActionCode?: string; status?: string },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.name) throw new BadRequestException('name required');
    return queryOne(
      `INSERT INTO runbook_definitions (tenant_id, name, description, steps, linked_action_code, status)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING *`,
      [
        tid,
        body.name,
        body.description ?? null,
        JSON.stringify(body.steps ?? []),
        body.linkedActionCode ?? null,
        body.status ?? 'draft',
      ],
    );
  }

  async listConnectors(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return query(
      `SELECT id, tenant_id, connector_type, name, config, status, last_health_at, created_at, updated_at
       FROM integration_connectors WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tid],
    );
  }

  async createConnector(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { connectorType: string; name: string; config?: Record<string, unknown> },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.connectorType || !body.name) throw new BadRequestException('connectorType and name required');
    return queryOne(
      `INSERT INTO integration_connectors (tenant_id, connector_type, name, config, status)
       VALUES ($1, $2, $3, $4::jsonb, 'configured')
       RETURNING id, tenant_id, connector_type, name, config, status, created_at`,
      [tid, body.connectorType, body.name, JSON.stringify(body.config ?? {})],
    );
  }

  async listAudit(tenantId: string | undefined, user: JwtPayload, limit = 50) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return query(
      `SELECT id, event_id, actor_id, actor_type, action, resource_type, resource_id, created_at, metadata
       FROM audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [tid, Math.min(limit, 100)],
    );
  }
}
