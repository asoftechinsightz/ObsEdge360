import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import { CurrentTenant } from './auth/current-tenant.decorator';
import type { JwtPayload } from './auth/auth.service';
import type { TenantContext } from './auth/authorization.guard';
import { query, queryOne, resolveTenantId } from '@opsedge360/shared-db';

@ApiTags('cmdb')
@ApiBearerAuth()
@Controller('cmdb')
export class CmdbProxyController {
  constructor(private proxy: ProxyService) {}

  private async tenantUuid(user: JwtPayload, tenant?: TenantContext): Promise<string> {
    if (tenant?.id) return tenant.id;
    return resolveTenantId(user.tenantId);
  }

  /** Prefer live CMDB service; on mesh/cert failure, serve illustrative estate from Postgres. */
  private async cmdbGet(
    path: string,
    tenantId: string,
    opts?: { query?: Record<string, string> },
  ): Promise<{ status: number; data: unknown } | null> {
    try {
      const result = await this.proxy.cmdb(path, { tenantId, query: opts?.query });
      if (result.status >= 500) return null;
      return result;
    } catch {
      return null;
    }
  }

  private async fallbackCis(tenantId: string, ciType?: string, search?: string) {
    const params: unknown[] = [tenantId];
    let where = 'tenant_id=$1';
    if (ciType) {
      params.push(ciType);
      where += ` AND ci_type=$${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND name ILIKE $${params.length}`;
    }
    params.push(200);
    const rows = await query<{
      id: string;
      name: string;
      ci_type: string;
      status: string;
      health_score: number;
      compliance_score: number;
      risk_score: number;
      ai_confidence_score: number;
      external_id: string | null;
      tags: string[] | null;
    }>(
      `SELECT id, name, ci_type, status, health_score, compliance_score, risk_score, ai_confidence_score, external_id, tags
       FROM configuration_items WHERE ${where} ORDER BY name ASC LIMIT $${params.length}`,
      params,
    ).catch(() => []);
    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      ciType: r.ci_type,
      status: r.status,
      healthScore: r.health_score,
      complianceScore: r.compliance_score,
      riskScore: r.risk_score,
      aiConfidenceScore: r.ai_confidence_score,
      externalId: r.external_id ?? undefined,
      tags: r.tags ?? [],
      illustrative: true,
      label: 'Illustrative Demo Data',
    }));
    return { items, total: items.length, illustrative: true, label: 'Illustrative Demo Data' };
  }

  private async fallbackStats(tenantId: string) {
    const summary = await queryOne<{
      servers: number;
      applications: number;
      databases: number;
      kubernetes_clusters: number;
      cloud_resources: number;
      network_devices: number;
      apis: number;
    }>(`SELECT * FROM ede_inventory_summary WHERE tenant_id=$1`, [tenantId]).catch(() => null);
    const counts = await queryOne<{ total: string; active: string; rels: string }>(
      `SELECT
         (SELECT COUNT(*)::text FROM configuration_items WHERE tenant_id=$1) AS total,
         (SELECT COUNT(*)::text FROM configuration_items WHERE tenant_id=$1 AND status='active') AS active,
         (SELECT COUNT(*)::text FROM relationships WHERE tenant_id=$1) AS rels`,
      [tenantId],
    ).catch(() => ({ total: '0', active: '0', rels: '0' }));
    const totalAssets = Number(counts?.total ?? 0);
    return {
      totalAssets,
      avgHealth: 92,
      openAlerts: 14,
      relationships: Number(counts?.rels ?? 0),
      activeAssets: Number(counts?.active ?? 0),
      atRiskAssets: Math.max(1, Math.round(totalAssets * 0.04)),
      byType: summary
        ? [
            { type: 'server', count: summary.servers },
            { type: 'application', count: summary.applications },
            { type: 'database', count: summary.databases },
            { type: 'kubernetes', count: summary.kubernetes_clusters },
            { type: 'cloud_resource', count: summary.cloud_resources },
            { type: 'network_device', count: summary.network_devices },
            { type: 'api', count: summary.apis },
          ]
        : [],
      byStatus: [
        { status: 'active', count: Number(counts?.active ?? 0) },
        { status: 'discovered', count: Math.max(0, totalAssets - Number(counts?.active ?? 0)) },
      ],
      illustrative: true,
      label: 'Illustrative Demo Data',
    };
  }

  private async fallbackDrift(tenantId: string) {
    const events = await query(
      `SELECT id, ci_id, drift_type, severity, summary, details, detected_at, resolved_at
       FROM drift_events WHERE tenant_id=$1 AND resolved_at IS NULL
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, detected_at DESC
       LIMIT 50`,
      [tenantId],
    ).catch(() => []);
    return { events, illustrative: true, label: 'Illustrative Demo Data' };
  }

  private async fallbackRelationships(tenantId: string) {
    const relationships = await query(
      `SELECT id, source_ci_id AS "sourceCiId", target_ci_id AS "targetCiId",
              relationship_type AS "relationshipType", COALESCE(strength,'normal') AS strength
       FROM relationships WHERE tenant_id=$1 ORDER BY created_at DESC NULLS LAST LIMIT 200`,
      [tenantId],
    ).catch(() => []);
    return { relationships, illustrative: true, label: 'Illustrative Demo Data' };
  }

  @Get('cis')
  @ApiOperation({ summary: 'List configuration items' })
  @ApiQuery({ name: 'ciType', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listCis(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('ciType') ciType?: string,
    @Query('search') search?: string,
    @Res() res?: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet('/cis', tid, {
      query: { ...(ciType && { ciType }), ...(search && { search }) },
    });
    if (live) return res!.status(live.status).json(live.data);
    return res!.status(200).json(await this.fallbackCis(tid, ciType, search));
  }

  @Get('cis/:id')
  @ApiOperation({ summary: 'Get configuration item by ID' })
  async getCi(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet(`/cis/${id}`, tid);
    if (live) return res.status(live.status).json(live.data);
    const row = await queryOne(
      `SELECT id, name, ci_type AS "ciType", status, health_score AS "healthScore",
              compliance_score AS "complianceScore", risk_score AS "riskScore"
       FROM configuration_items WHERE tenant_id=$1 AND id=$2`,
      [tid, id],
    ).catch(() => null);
    return res.status(row ? 200 : 404).json(row ?? { error: 'Not found' });
  }

  @Get('cis/:id/relationships')
  @ApiOperation({ summary: 'Get CI relationships' })
  async getRelationships(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet(`/cis/${id}/relationships`, tid);
    if (live) return res.status(live.status).json(live.data);
    const relationships = await query(
      `SELECT id, source_ci_id AS "sourceCiId", target_ci_id AS "targetCiId",
              relationship_type AS "relationshipType", COALESCE(strength,'normal') AS strength
       FROM relationships WHERE tenant_id=$1 AND (source_ci_id=$2 OR target_ci_id=$2) LIMIT 100`,
      [tid, id],
    ).catch(() => []);
    return res.status(200).json({ relationships });
  }

  @Post('cis')
  @ApiOperation({ summary: 'Create or update configuration item' })
  async upsertCi(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const result = await this.proxy.cmdb('/cis', { method: 'POST', body, tenantId: tid });
    return res.status(result.status).json(result.data);
  }

  @Patch('cis/:id')
  @ApiOperation({ summary: 'Update configuration item' })
  async updateCi(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const result = await this.proxy.cmdb(`/cis/${id}`, { method: 'PATCH', body, tenantId: tid });
    return res.status(result.status).json(result.data);
  }

  @Delete('cis/:id')
  @ApiOperation({ summary: 'Delete configuration item' })
  async deleteCi(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const result = await this.proxy.cmdb(`/cis/${id}`, { method: 'DELETE', tenantId: tid });
    return res.status(result.status).json(result.data);
  }

  @Get('relationships')
  @ApiOperation({ summary: 'List all relationships' })
  async listRelationships(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet('/relationships', tid);
    if (live) return res.status(live.status).json(live.data);
    return res.status(200).json(await this.fallbackRelationships(tid));
  }

  @Post('relationships')
  @ApiOperation({ summary: 'Create relationship between CIs' })
  async createRelationship(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const result = await this.proxy.cmdb('/relationships', { method: 'POST', body, tenantId: tid });
    return res.status(result.status).json(result.data);
  }

  @Delete('relationships/:id')
  @ApiOperation({ summary: 'Delete relationship' })
  async deleteRelationship(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const result = await this.proxy.cmdb(`/relationships/${id}`, { method: 'DELETE', tenantId: tid });
    return res.status(result.status).json(result.data);
  }

  @Get('stats')
  @ApiOperation({ summary: 'CMDB statistics' })
  async getStats(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet('/stats', tid);
    if (live) return res.status(live.status).json(live.data);
    return res.status(200).json(await this.fallbackStats(tid));
  }

  @Post('import')
  @ApiOperation({ summary: 'Bulk import configuration items' })
  async importCis(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const result = await this.proxy.cmdb('/import', { method: 'POST', body, tenantId: tid });
    return res.status(result.status).json(result.data);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export CMDB as JSON or CSV' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async exportCis(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const isCsv = format === 'csv';
    try {
      const result = await this.proxy.cmdb('/export', {
        tenantId: tid,
        query: { format: format ?? 'json' },
        responseType: isCsv ? 'text' : 'json',
      });
      if (isCsv) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="cmdb-export.csv"');
        return res.status(result.status).send(result.data);
      }
      return res.status(result.status).json(result.data);
    } catch {
      const data = await this.fallbackCis(tid);
      return res.status(200).json(data);
    }
  }

  @Post('topology/sync-traces')
  @ApiOperation({ summary: 'Sync trace-derived service dependencies into CMDB topology' })
  async syncTraces(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const result = await this.proxy.cmdb('/topology/sync-traces', {
      method: 'POST',
      body: body ?? {},
      tenantId: tid,
    });
    return res.status(result.status).json(result.data);
  }

  @Get('topology/dependencies')
  @ApiOperation({ summary: 'List inferred topology dependencies (trace/discovery)' })
  @ApiQuery({ name: 'origin', required: false })
  async listDependencies(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('origin') origin: string | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet('/topology/dependencies', tid, {
      query: { ...(origin ? { origin } : {}) },
    });
    if (live) return res.status(live.status).json(live.data);
    return res.status(200).json({ dependencies: [], illustrative: true });
  }

  @Get('topology/layers')
  @ApiOperation({ summary: 'Topology layer catalog with node counts' })
  async listLayers(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet('/topology/layers', tid);
    if (live) return res.status(live.status).json(live.data);
    return res.status(200).json({ layers: [], illustrative: true });
  }

  @Get('topology/events')
  @ApiOperation({ summary: 'Poll live topology events cursor' })
  @ApiQuery({ name: 'afterId', required: false })
  async listTopologyEvents(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('afterId') afterId: string | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet('/topology/events', tid, {
      query: { ...(afterId ? { afterId } : {}) },
    });
    if (live) return res.status(live.status).json(live.data);
    return res.status(200).json({ events: [] });
  }

  @Get('topology/:type')
  @ApiOperation({
    summary: 'Get versioned topology snapshot',
    description:
      'Returns latest topology for type: application | infrastructure | cloud | network | business-service | kubernetes | service. Proxies CMDB topology engine.',
  })
  async getTopology(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet(`/topology/${encodeURIComponent(type)}`, tid);
    if (live) return res.status(live.status).json(live.data);
    // Build a lightweight hybrid topology from tagged demo CIs when mesh is down
    const nodes = await query<{ id: string; name: string; ci_type: string; health_score: number }>(
      `SELECT id, name, ci_type, health_score FROM configuration_items
       WHERE tenant_id=$1 ORDER BY name ASC LIMIT 80`,
      [tid],
    ).catch(() => []);
    const edges = await query<{ source_ci_id: string; target_ci_id: string; relationship_type: string }>(
      `SELECT source_ci_id, target_ci_id, relationship_type FROM relationships
       WHERE tenant_id=$1 LIMIT 120`,
      [tid],
    ).catch(() => []);
    return res.status(200).json({
      type,
      illustrative: true,
      label: 'Illustrative Demo Data',
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.name,
        type: n.ci_type,
        healthScore: n.health_score,
      })),
      edges: edges.map((e) => ({
        source: e.source_ci_id,
        target: e.target_ci_id,
        type: e.relationship_type,
      })),
    });
  }

  @Post('topology/:type/refresh')
  @ApiOperation({
    summary: 'Incrementally refresh and version a topology snapshot',
  })
  async refreshTopology(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    try {
      const result = await this.proxy.cmdb(`/topology/${encodeURIComponent(type)}/refresh`, {
        method: 'POST',
        tenantId: tid,
      });
      return res.status(result.status).json(result.data);
    } catch {
      return this.getTopology(user, tenant, type, res);
    }
  }

  @Post('topology/:type/layout')
  @ApiOperation({ summary: 'Compute and persist topology layout positions' })
  async layoutTopology(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('type') type: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    try {
      const result = await this.proxy.cmdb(`/topology/${encodeURIComponent(type)}/layout`, {
        method: 'POST',
        body: body ?? {},
        tenantId: tid,
      });
      return res.status(result.status).json(result.data);
    } catch {
      return res.status(200).json({ ok: true, illustrative: true, type });
    }
  }

  @Get('assets')
  @ApiOperation({ summary: 'Asset inventory (CI alias)' })
  @ApiQuery({ name: 'ciType', required: false })
  @ApiQuery({ name: 'q', required: false })
  async listAssets(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('ciType') ciType: string | undefined,
    @Query('q') q: string | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet('/assets', tid, {
      query: { ...(ciType ? { ciType } : {}), ...(q ? { q } : {}) },
    });
    if (live) return res.status(live.status).json(live.data);
    const data = await this.fallbackCis(tid, ciType, q);
    return res.status(200).json({ assets: data.items, items: data.items, illustrative: true });
  }

  @Get('drift')
  @ApiOperation({ summary: 'Configuration drift events' })
  async listDrift(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet('/drift', tid);
    if (live) return res.status(live.status).json(live.data);
    return res.status(200).json(await this.fallbackDrift(tid));
  }

  @Get('history')
  @ApiOperation({ summary: 'CI configuration history' })
  @ApiQuery({ name: 'ciId', required: true })
  async listHistory(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('ciId') ciId: string,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const live = await this.cmdbGet('/history', tid, { query: { ciId } });
    if (live) return res.status(live.status).json(live.data);
    const history = await query(
      `SELECT * FROM ci_config_history WHERE tenant_id=$1 AND ci_id=$2 ORDER BY changed_at DESC LIMIT 50`,
      [tid, ciId],
    ).catch(() => []);
    return res.status(200).json({ history, illustrative: true });
  }
}
