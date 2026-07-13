import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ProxyService } from './proxy.service';
import { CurrentUser } from './auth/current-user.decorator';
import { CurrentTenant } from './auth/current-tenant.decorator';
import type { JwtPayload } from './auth/auth.service';
import type { TenantContext } from './auth/authorization.guard';
import { query, resolveTenantId } from '@opsedge360/shared-db';
import { TwinBsiService } from './twin/twin-bsi.service';

@ApiTags('twin')
@ApiBearerAuth()
@Controller('twin')
export class TwinController {
  constructor(
    private proxy: ProxyService,
    private twinBsi: TwinBsiService,
  ) {}

  private async tenantUuid(user: JwtPayload, tenant?: TenantContext): Promise<string> {
    if (tenant?.id) return tenant.id;
    return resolveTenantId(user.tenantId);
  }

  private async cmdbGet(
    path: string,
    tenantId: string,
    opts?: { query?: Record<string, string> },
  ): Promise<{ status: number; data: unknown } | null> {
    try {
      const result = await this.proxy.cmdb(path, { tenantId, query: opts?.query });
      if (result.status >= 500) return null;
      const data = result.data as { nodes?: unknown[] } | null;
      if (result.status === 200 && data && Array.isArray(data.nodes) && data.nodes.length === 0) {
        return null; // force fallback when empty
      }
      return result;
    } catch {
      return null;
    }
  }

  private async fallbackGraph(tenantId: string, ciType?: string, limit = 120) {
    const max = Math.min(Math.max(limit, 10), 300);
    // Prefer CIs that participate in relationships so Twin edges are visible
    const relatedIds = await query<{ id: string }>(
      `SELECT DISTINCT x.id FROM (
         SELECT source_ci_id AS id FROM relationships WHERE tenant_id=$1
         UNION
         SELECT target_ci_id AS id FROM relationships WHERE tenant_id=$1
       ) x
       LIMIT $2`,
      [tenantId, max],
    ).catch(() => []);

    let nodes: Array<{
      id: string;
      name: string;
      ci_type: string;
      health_score: number;
      risk_score: number;
      status: string;
    }> = [];

    if (relatedIds.length) {
      nodes = await query<{
        id: string;
        name: string;
        ci_type: string;
        health_score: number;
        risk_score: number;
        status: string;
      }>(
        `SELECT id, name, ci_type, health_score, risk_score, status
         FROM configuration_items
         WHERE tenant_id=$1 AND id = ANY($2::uuid[])
         ORDER BY name ASC`,
        [tenantId, relatedIds.map((r) => r.id)],
      ).catch(() => []);
    }

    if (nodes.length < Math.min(40, max)) {
      const params: unknown[] = [tenantId];
      let where = 'tenant_id=$1';
      if (ciType) {
        params.push(ciType);
        where += ` AND ci_type=$${params.length}`;
      }
      params.push(max);
      const more = await query<{
        id: string;
        name: string;
        ci_type: string;
        health_score: number;
        risk_score: number;
        status: string;
      }>(
        `SELECT id, name, ci_type, health_score, risk_score, status
         FROM configuration_items WHERE ${where}
         ORDER BY name ASC LIMIT $${params.length}`,
        params,
      ).catch(() => []);
      const seen = new Set(nodes.map((n) => n.id));
      for (const n of more) {
        if (!seen.has(n.id)) {
          nodes.push(n);
          seen.add(n.id);
        }
        if (nodes.length >= max) break;
      }
    }

    const ids = nodes.map((n) => n.id);
    const edges =
      ids.length === 0
        ? []
        : await query<{
            source_ci_id: string;
            target_ci_id: string;
            relationship_type: string;
            strength: string | null;
          }>(
            `SELECT source_ci_id, target_ci_id, relationship_type, strength::text AS strength
             FROM relationships WHERE tenant_id=$1 LIMIT 500`,
            [tenantId],
          ).catch(() => []);
    const idSet = new Set(ids);
    const filteredEdges = edges.filter((e) => idSet.has(e.source_ci_id) && idSet.has(e.target_ci_id));
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.name,
        type: n.ci_type,
        status: n.status,
        healthScore: n.health_score,
        riskScore: n.risk_score,
      })),
      edges: filteredEdges.map((e) => ({
        source: e.source_ci_id,
        target: e.target_ci_id,
        type: e.relationship_type,
        strength: e.strength ?? 'normal',
      })),
      illustrative: true,
      label: 'Illustrative Demo Data',
      source: 'postgres-fallback',
    };
  }

  private async fallbackBlast(tenantId: string, ciId: string, depth = 3, direction = 'downstream') {
    const root = await query(
      `SELECT id, name, ci_type, health_score, risk_score, status FROM configuration_items
       WHERE tenant_id=$1 AND id=$2`,
      [tenantId, ciId],
    ).catch(() => []);
    if (!root.length) {
      return {
        rootCiId: ciId,
        rootCiName: 'Unknown',
        rootCiType: 'unknown',
        depth,
        direction,
        affectedCis: 0,
        criticalCount: 0,
        atRiskCount: 0,
        avgHealth: 0,
        nodes: [],
        edges: [],
        source: 'postgres-fallback',
      };
    }
    const r = root[0] as {
      id: string;
      name: string;
      ci_type: string;
      health_score: number;
      risk_score: number;
      status: string;
    };
    const rels = await query<{ source_ci_id: string; target_ci_id: string; relationship_type: string; strength: string }>(
      `WITH RECURSIVE walk AS (
         SELECT source_ci_id, target_ci_id, relationship_type, strength, 1 AS d
         FROM relationships WHERE tenant_id=$1 AND (source_ci_id=$2 OR target_ci_id=$2)
         UNION
         SELECT r.source_ci_id, r.target_ci_id, r.relationship_type, r.strength, w.d + 1
         FROM relationships r
         JOIN walk w ON (r.source_ci_id = w.target_ci_id OR r.target_ci_id = w.source_ci_id)
         WHERE r.tenant_id=$1 AND w.d < $3
       )
       SELECT DISTINCT source_ci_id, target_ci_id, relationship_type, strength FROM walk LIMIT 200`,
      [tenantId, ciId, depth],
    ).catch(() => []);
    const idSet = new Set<string>([ciId]);
    for (const e of rels) {
      idSet.add(e.source_ci_id);
      idSet.add(e.target_ci_id);
    }
    const nodes = await query<{
      id: string;
      name: string;
      ci_type: string;
      health_score: number;
      risk_score: number;
      status: string;
    }>(
      `SELECT id, name, ci_type, health_score, risk_score, status FROM configuration_items
       WHERE tenant_id=$1 AND id = ANY($2::uuid[])`,
      [tenantId, [...idSet]],
    ).catch(() => []);
    const criticalCount = nodes.filter((n) => Number(n.health_score) < 70).length;
    const avgHealth = nodes.length
      ? Math.round(nodes.reduce((s, n) => s + Number(n.health_score || 0), 0) / nodes.length)
      : 0;
    return {
      rootCiId: r.id,
      rootCiName: r.name,
      rootCiType: r.ci_type,
      depth,
      direction,
      affectedCis: Math.max(0, nodes.length - 1),
      criticalCount,
      atRiskCount: nodes.filter((n) => Number(n.health_score) < 85).length,
      avgHealth,
      nodes: nodes.map((n, i) => ({
        id: n.id,
        name: n.name,
        ciType: n.ci_type,
        status: n.status,
        healthScore: n.health_score,
        riskScore: n.risk_score,
        depth: n.id === ciId ? 0 : Math.min(depth, 1 + (i % depth)),
      })),
      edges: rels.map((e) => ({
        source: e.source_ci_id,
        target: e.target_ci_id,
        type: e.relationship_type,
        strength: e.strength ?? 'normal',
      })),
      source: 'postgres-fallback',
      illustrative: true,
    };
  }

  @Get('graph')
  @ApiOperation({ summary: 'Get digital twin topology graph' })
  @ApiQuery({ name: 'ciType', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({ name: 'view', required: false })
  @ApiQuery({ name: 'asOf', required: false })
  async getGraph(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('ciType') ciType: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('serviceId') serviceId: string | undefined,
    @Query('view') view: string | undefined,
    @Query('asOf') asOf: string | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    if (view === 'enterprise' || serviceId) {
      const graph = await this.twinBsi.getEnterpriseGraph(tid, {
        serviceId,
        limit: limit ? Number(limit) : 160,
        asOf,
      });
      return res.status(200).json(graph);
    }
    const live = await this.cmdbGet('/twin/graph', tid, {
      query: {
        ...(ciType && { ciType }),
        ...(limit && { limit }),
      },
    });
    if (live) return res.status(live.status).json(live.data);
    return res.status(200).json(await this.fallbackGraph(tid, ciType, limit ? Number(limit) : 120));
  }

  @Get('business-services')
  @ApiOperation({ summary: 'Business service modeling with health, SLA, ownership, KPIs' })
  async listBusinessServices(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
    const items = await this.twinBsi.listBusinessServices(tid);
    return { brand: 'OpsEdge360', asOf: new Date().toISOString(), count: items.length, items };
  }

  @Get('business-services/:id')
  @ApiOperation({ summary: 'Business service detail' })
  async getBusinessService(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const item = await this.twinBsi.getBusinessService(tid, id);
    return item ?? { error: 'not_found' };
  }

  @Get('business-services/:id/blast-radius')
  @ApiOperation({ summary: 'Blast radius starting from a business service' })
  @ApiQuery({ name: 'depth', required: false })
  @ApiQuery({ name: 'direction', required: false })
  async businessBlast(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @CurrentTenant() tenant?: TenantContext,
    @Query('depth') depth?: string,
    @Query('direction') direction?: string,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    const blast = await this.twinBsi.blastRadiusForService(tid, id, {
      depth: depth ? Number(depth) : 3,
      direction: direction || 'downstream',
    });
    return blast ?? { error: 'not_found' };
  }

  @Get('business-services/:id/history')
  @ApiOperation({ summary: 'Health history (time-travel MVP)' })
  @ApiQuery({ name: 'hours', required: false })
  async serviceHistory(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @CurrentTenant() tenant?: TenantContext,
    @Query('hours') hours?: string,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    return this.twinBsi.getServiceHistory(tid, id, hours ? Number(hours) : 24);
  }

  @Get('executive-risk')
  @ApiOperation({ summary: 'Executive risk dashboard grounded in Digital Twin' })
  async executiveRisk(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const tid = await this.tenantUuid(user, tenant);
    return this.twinBsi.getExecutiveRisk(tid);
  }

  @Post('ai/explain')
  @ApiOperation({ summary: 'AI investigation grounded in Digital Twin relationships' })
  async aiExplain(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant?: TenantContext,
    @Body() body?: { serviceId?: string; ciId?: string; name?: string; prompt?: string },
  ) {
    const tid = await this.tenantUuid(user, tenant);
    return this.twinBsi.explainWithTwin(tid, body || {});
  }

  @Post('business-services/:id/snapshot')
  @ApiOperation({ summary: 'Record health propagation snapshot for time travel' })
  async snapshot(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @CurrentTenant() tenant?: TenantContext,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    await this.twinBsi.recordHealthSnapshot(tid, id);
    return { ok: true, serviceId: id };
  }

  @Get('impact/:ciId')
  @ApiOperation({ summary: 'Dependency impact analysis' })
  @ApiQuery({ name: 'depth', required: false })
  @ApiQuery({ name: 'direction', required: false, enum: ['downstream', 'upstream', 'both'] })
  async getImpact(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('ciId') ciId: string,
    @Query('depth') depth: string | undefined,
    @Query('direction') direction: string | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    try {
      const result = await this.proxy.cmdb(`/twin/impact/${ciId}`, {
        tenantId: tid,
        query: {
          ...(depth && { depth }),
          ...(direction && { direction }),
        },
      });
      if (result.status < 500) return res.status(result.status).json(result.data);
    } catch {
      /* fallback */
    }
    return res
      .status(200)
      .json(await this.fallbackBlast(tid, ciId, depth ? Number(depth) : 3, direction || 'downstream'));
  }

  @Get('blast-radius/:ciId')
  @ApiOperation({ summary: 'Blast-radius visualization data' })
  @ApiQuery({ name: 'depth', required: false })
  @ApiQuery({ name: 'direction', required: false, enum: ['downstream', 'upstream', 'both'] })
  async getBlastRadius(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Param('ciId') ciId: string,
    @Query('depth') depth: string | undefined,
    @Query('direction') direction: string | undefined,
    @Res() res: Response,
  ) {
    const tid = await this.tenantUuid(user, tenant);
    try {
      const result = await this.proxy.cmdb(`/twin/blast-radius/${ciId}`, {
        tenantId: tid,
        query: {
          ...(depth && { depth }),
          ...(direction && { direction }),
        },
      });
      if (result.status < 500) {
        const data = result.data as { nodes?: unknown[] };
        if (Array.isArray(data?.nodes) && data.nodes.length > 0) {
          return res.status(result.status).json(result.data);
        }
      }
    } catch {
      /* fallback */
    }
    return res
      .status(200)
      .json(await this.fallbackBlast(tid, ciId, depth ? Number(depth) : 3, direction || 'downstream'));
  }
}
