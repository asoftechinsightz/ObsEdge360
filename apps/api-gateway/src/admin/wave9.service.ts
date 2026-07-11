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

const MODULES = [
  'platform',
  'security',
  'observability',
  'discovery',
  'cmdb',
  'topology',
  'ai_gateway',
  'knowledge_graph',
  'administration',
  'governance',
  'automation',
  'integrations',
  'deployment',
  'certification',
] as const;

@Injectable()
export class Wave9Service {
  private async audit(
    tenantId: string | null,
    actorId: string | undefined,
    action: string,
    resourceType?: string,
    resourceId?: string,
    detail?: Record<string, unknown>,
  ) {
    try {
      await query(
        `INSERT INTO governance_audit_events (tenant_id, actor_id, action, resource_type, resource_id, detail)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [tenantId, actorId ?? null, action, resourceType ?? null, resourceId ?? null, JSON.stringify(detail ?? {})],
      );
    } catch {
      /* optional */
    }
  }

  async overview(user: JwtPayload) {
    requireAdmin(user);
    const release = await queryOne(`SELECT * FROM ga_releases WHERE version='v1.0.0' ORDER BY created_at DESC LIMIT 1`);
    const regressions = await query(
      `SELECT DISTINCT ON (module_key) module_key, status, executed_at
       FROM ga_regression_runs ORDER BY module_key, executed_at DESC`,
    );
    const signoffs = await query(
      `SELECT report_type, title, status, signed_at FROM ga_signoffs ORDER BY signed_at DESC LIMIT 20`,
    );
    return {
      wave: 'v1.0.0',
      gaClaim: true,
      baseline: 'v1.0.0-rc1',
      release,
      modules: MODULES,
      regressions,
      signoffs,
      checkedAt: new Date().toISOString(),
    };
  }

  async recordRegression(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      moduleKey: string;
      status?: string;
      checks?: unknown[];
      evidence?: Record<string, unknown>;
    },
  ) {
    requireAdmin(user);
    if (!MODULES.includes(body.moduleKey as (typeof MODULES)[number])) {
      throw new BadRequestException(`moduleKey must be one of ${MODULES.join(',')}`);
    }
    const ga = await queryOne<{ id: string }>(`SELECT id FROM ga_releases WHERE version='v1.0.0' LIMIT 1`);
    const row = await queryOne(
      `INSERT INTO ga_regression_runs (ga_release_id, module_key, status, checks, evidence)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb) RETURNING *`,
      [
        ga?.id ?? null,
        body.moduleKey,
        body.status ?? 'passed',
        JSON.stringify(body.checks ?? []),
        JSON.stringify({ ...(body.evidence ?? {}), actor: user.sub }),
      ],
    );
    await this.audit(tenantId ?? null, user.sub, 'ga.regression.recorded', 'ga_regression_runs', String(row?.id), {
      moduleKey: body.moduleKey,
    });
    return row;
  }

  async listRegressions(user: JwtPayload) {
    requireAdmin(user);
    return {
      runs: await query(`SELECT * FROM ga_regression_runs ORDER BY executed_at DESC LIMIT 200`),
      modules: MODULES,
    };
  }

  async upsertSignoff(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { reportType: string; title?: string; body?: Record<string, unknown>; status?: string },
  ) {
    requireAdmin(user);
    if (!body.reportType) throw new BadRequestException('reportType required');
    const ga = await queryOne<{ id: string }>(`SELECT id FROM ga_releases WHERE version='v1.0.0' LIMIT 1`);
    if (!ga) throw new NotFoundException('GA release row missing');
    const row = await queryOne(
      `INSERT INTO ga_signoffs (ga_release_id, report_type, title, body, status, signed_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6) RETURNING *`,
      [
        ga.id,
        body.reportType,
        body.title ?? body.reportType,
        JSON.stringify({ wave: 'v1.0.0', ...(body.body ?? {}) }),
        body.status ?? 'approved',
        user.sub,
      ],
    );
    await this.audit(tenantId ?? null, user.sub, 'ga.signoff.recorded', 'ga_signoffs', String(row?.id), {
      reportType: body.reportType,
    });
    return row;
  }

  async approveRelease(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      productionSha?: string;
      validationToken?: string;
      manifest?: Record<string, unknown>;
      sbom?: Record<string, unknown>;
      readiness?: Record<string, unknown>;
      status?: string;
    },
  ) {
    requireAdmin(user);
    const row = await queryOne(
      `UPDATE ga_releases SET
         status = COALESCE($1, status),
         production_sha = COALESCE($2, production_sha),
         validation_token = COALESCE($3, validation_token),
         manifest = CASE WHEN $4::text IS NULL THEN manifest ELSE $4::jsonb END,
         sbom = CASE WHEN $5::text IS NULL THEN sbom ELSE $5::jsonb END,
         readiness = CASE WHEN $6::text IS NULL THEN readiness ELSE $6::jsonb END,
         approved_by = $7,
         approved_at = NOW(),
         updated_at = NOW()
       WHERE version='v1.0.0'
       RETURNING *`,
      [
        body.status ?? 'approved',
        body.productionSha ?? null,
        body.validationToken ?? null,
        body.manifest ? JSON.stringify(body.manifest) : null,
        body.sbom ? JSON.stringify(body.sbom) : null,
        body.readiness ? JSON.stringify(body.readiness) : null,
        user.sub,
      ],
    );
    if (!row) throw new NotFoundException('GA release not found');
    await this.audit(tenantId ?? null, user.sub, 'ga.release.approved', 'ga_releases', String(row.id), {
      status: body.status ?? 'approved',
    });
    return row;
  }

  async readinessReport(user: JwtPayload) {
    requireAdmin(user);
    const release = await queryOne(`SELECT * FROM ga_releases WHERE version='v1.0.0' LIMIT 1`);
    const mods = await query<{ module_key: string; status: string }>(
      `SELECT DISTINCT ON (module_key) module_key, status
       FROM ga_regression_runs ORDER BY module_key, executed_at DESC`,
    );
    const passed = mods.filter((m) => m.status === 'passed').length;
    const signoffs = await query(`SELECT report_type, status FROM ga_signoffs ORDER BY signed_at DESC`);
    return {
      wave: 'v1.0.0',
      gaClaim: true,
      release,
      regression: { required: MODULES.length, passed, modules: mods },
      signoffs,
      ready: passed >= MODULES.length,
      checkedAt: new Date().toISOString(),
    };
  }
}
