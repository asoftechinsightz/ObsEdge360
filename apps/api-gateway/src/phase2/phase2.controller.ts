import { Body, Controller, ForbiddenException, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { getPlatformConfig, isOutboundDisabled } from '@opsedge360/platform-config';
import { query, queryOne } from '@opsedge360/shared-db';
import { PermissionIds } from '@opsedge360/shared-security';
import { Public } from '../auth/public.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';

function requireAdmin(user: JwtPayload) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
}

@ApiTags('phase2')
@ApiBearerAuth()
@Controller('platform')
export class Phase2Controller {
  @Public()
  @Get('environment')
  @ApiOperation({ summary: 'Active APP_ENV plane (banner + isolation flags)' })
  environment() {
    const cfg = getPlatformConfig();
    return {
      appEnv: cfg.appEnv,
      environmentLabel: cfg.environmentLabel,
      databaseName: cfg.databaseName,
      isDemo: cfg.isDemo,
      outboundDisabled: cfg.outboundDisabled,
      deploymentMode: cfg.deploymentMode,
      planes: ['production', 'demo', 'development', 'local', 'uat', 'staging'],
      logicalDatabases: {
        production: 'opsedge360_prod',
        demo: 'opsedge360_demo',
        development: 'opsedge360_dev',
        local: 'opsedge360_local',
      },
    };
  }

  @Get('feature-flags')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  async featureFlags(@CurrentUser() user: JwtPayload) {
    requireAdmin(user);
    const flags = await query(
      `SELECT flag_key, enabled, payload, tenant_id FROM feature_flags
       WHERE tenant_id IS NULL ORDER BY flag_key`,
    );
    return { flags, outboundDisabled: isOutboundDisabled() };
  }

  @Get('industry-framework')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  async industryFramework(@CurrentUser() user: JwtPayload) {
    requireAdmin(user);
    return {
      packs: await query(`SELECT code, title, status, schema_version, capabilities FROM industry_pack_framework ORDER BY code`),
      note: 'Framework only — full industry packs beyond Banking360 are planned',
    };
  }

  @Get('demo/organizations')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  async demoOrgs(@CurrentUser() user: JwtPayload) {
    requireAdmin(user);
    return { organizations: await query(`SELECT * FROM demo_organizations ORDER BY industry`) };
  }

  @Post('demo/refresh')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  @ApiOperation({ summary: 'Record demo refresh attestation (seed script performs data load)' })
  async demoRefresh(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { recordsSeeded?: number; detail?: Record<string, unknown> },
  ) {
    requireAdmin(user);
    const cfg = getPlatformConfig();
    if (!cfg.isDemo && process.env.ALLOW_DEMO_REFRESH_OUTSIDE_DEMO !== 'true') {
      throw new ForbiddenException('Demo refresh only allowed when APP_ENV=demo');
    }
    const row = await queryOne(
      `INSERT INTO demo_refresh_runs (environment_code, status, records_seeded, detail, completed_at)
       VALUES ('demo','completed',$1,$2::jsonb,NOW()) RETURNING *`,
      [
        body.recordsSeeded ?? 0,
        JSON.stringify({ actor: user.sub, tenantId: tenant?.id, ...(body.detail ?? {}) }),
      ],
    );
    await query(`UPDATE demo_organizations SET last_refreshed_at = NOW(), status='ready'`);
    return row;
  }

  @Get('itsm/summary')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  async itsmSummary(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    requireAdmin(user);
    const tid = tenant?.id;
    if (!tid) return { problems: 0, changes: 0, windows: 0, articles: 0, catalog: 0 };
    const row = await queryOne<{
      problems: string;
      changes: string;
      windows: string;
      articles: string;
      catalog: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM itsm_problems WHERE tenant_id=$1) AS problems,
         (SELECT COUNT(*)::text FROM itsm_changes WHERE tenant_id=$1) AS changes,
         (SELECT COUNT(*)::text FROM itsm_maintenance_windows WHERE tenant_id=$1) AS windows,
         (SELECT COUNT(*)::text FROM itsm_knowledge_articles WHERE tenant_id=$1) AS articles,
         (SELECT COUNT(*)::text FROM itsm_service_catalog_items WHERE tenant_id=$1) AS catalog`,
      [tid],
    );
    return {
      foundation: true,
      problems: Number(row?.problems ?? 0),
      changes: Number(row?.changes ?? 0),
      maintenanceWindows: Number(row?.windows ?? 0),
      knowledgeArticles: Number(row?.articles ?? 0),
      catalogItems: Number(row?.catalog ?? 0),
    };
  }
}
