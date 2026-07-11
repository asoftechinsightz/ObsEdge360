import { query, queryOne } from '@opsedge360/shared-db';
import * as opsIntel from './ops-intelligence.service';
import * as monitoring from './monitoring.service';

export const WIDGET_CATALOG = [
  {
    type: 'kpi',
    title: 'KPI strip',
    description: 'Ops intelligence health KPIs',
    defaultDataSource: { api: 'ops-intelligence/health' },
    defaultSize: { w: 12, h: 2 },
  },
  {
    type: 'incidents',
    title: 'Incidents',
    description: 'Correlated open incidents',
    defaultDataSource: { api: 'ops-intelligence/incidents', params: { status: 'open' } },
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: 'anomalies',
    title: 'Anomalies',
    description: 'Open anomalies',
    defaultDataSource: { api: 'ops-intelligence/anomalies' },
    defaultSize: { w: 6, h: 4 },
  },
  {
    type: 'signals',
    title: 'Signals',
    description: 'Unified ops intelligence signals',
    defaultDataSource: { api: 'ops-intelligence/signals' },
    defaultSize: { w: 6, h: 3 },
  },
  {
    type: 'forecasts',
    title: 'Forecasts',
    description: 'Trend forecasts',
    defaultDataSource: { api: 'ops-intelligence/forecasts' },
    defaultSize: { w: 6, h: 3 },
  },
  {
    type: 'timeseries',
    title: 'Timeseries',
    description: 'Recent Prometheus samples',
    defaultDataSource: { api: 'prometheus/samples', params: { limit: '50' } },
    defaultSize: { w: 8, h: 4 },
  },
  {
    type: 'topology',
    title: 'Topology snapshot',
    description: 'CMDB topology layer stats',
    defaultDataSource: { api: 'cmdb/topology/layers' },
    defaultSize: { w: 4, h: 4 },
  },
  {
    type: 'slo',
    title: 'Infra summary',
    description: 'Observability infra summary',
    defaultDataSource: { api: 'observability/summary' },
    defaultSize: { w: 6, h: 3 },
  },
  {
    type: 'cmdb_stats',
    title: 'CMDB stats',
    description: 'Configuration item counts',
    defaultDataSource: { api: 'cmdb/stats' },
    defaultSize: { w: 4, h: 3 },
  },
] as const;

export type WidgetType = (typeof WIDGET_CATALOG)[number]['type'];

function mapDashboard(row: Record<string, unknown>) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    isDefault: Boolean(row.is_default),
    layoutVersion: Number(row.layout_version ?? 1),
    refreshSeconds: Number(row.refresh_seconds ?? 30),
    visibility: row.visibility,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWidget(row: Record<string, unknown>) {
  return {
    id: row.id,
    dashboardId: row.dashboard_id,
    widgetType: row.widget_type,
    title: row.title,
    gridX: Number(row.grid_x ?? 0),
    gridY: Number(row.grid_y ?? 0),
    gridW: Number(row.grid_w ?? 4),
    gridH: Number(row.grid_h ?? 3),
    dataSource: row.data_source ?? {},
    options: row.options ?? {},
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listCatalog() {
  return { widgets: WIDGET_CATALOG, count: WIDGET_CATALOG.length };
}

export async function listDashboards(tenantId: string) {
  const rows = await query(
    `SELECT * FROM ops_dashboards WHERE tenant_id = $1 ORDER BY is_default DESC, updated_at DESC`,
    [tenantId],
  );
  return rows.map((r) => mapDashboard(r as Record<string, unknown>));
}

export async function getDashboard(tenantId: string, id: string) {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM ops_dashboards WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
  if (!row) return null;
  const widgets = await query(
    `SELECT * FROM ops_dashboard_widgets WHERE tenant_id = $1 AND dashboard_id = $2 ORDER BY sort_order, created_at`,
    [tenantId, id],
  );
  const shares = await query(
    `SELECT * FROM ops_dashboard_shares WHERE tenant_id = $1 AND dashboard_id = $2`,
    [tenantId, id],
  );
  return {
    ...mapDashboard(row),
    widgets: widgets.map((w) => mapWidget(w as Record<string, unknown>)),
    shares: shares.map((s) => ({
      id: (s as Record<string, unknown>).id,
      principalType: (s as Record<string, unknown>).principal_type,
      principalId: (s as Record<string, unknown>).principal_id,
      permission: (s as Record<string, unknown>).permission,
    })),
  };
}

export async function createDashboard(
  tenantId: string,
  input: {
    name: string;
    description?: string;
    refreshSeconds?: number;
    visibility?: string;
    isDefault?: boolean;
    createdBy?: string;
    seedNoc?: boolean;
  },
) {
  if (!input.name?.trim()) throw new Error('name required');
  if (input.isDefault) {
    await query(`UPDATE ops_dashboards SET is_default = false WHERE tenant_id = $1`, [tenantId]);
  }
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO ops_dashboards
      (tenant_id, name, description, is_default, refresh_seconds, visibility, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      tenantId,
      input.name.trim(),
      input.description ?? null,
      Boolean(input.isDefault),
      Math.min(Math.max(input.refreshSeconds ?? 30, 5), 3600),
      input.visibility === 'private' ? 'private' : 'tenant',
      input.createdBy ?? null,
    ],
  );
  const dash = mapDashboard(row!);
  if (input.seedNoc !== false) {
    await seedNocWidgets(tenantId, String(dash.id));
  }
  return getDashboard(tenantId, String(dash.id));
}

async function seedNocWidgets(tenantId: string, dashboardId: string) {
  const seeds: Array<{
    type: string;
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
    ds: Record<string, unknown>;
    order: number;
  }> = [
    { type: 'kpi', title: 'Ops KPIs', x: 0, y: 0, w: 12, h: 2, ds: { api: 'ops-intelligence/health' }, order: 0 },
    { type: 'incidents', title: 'Open incidents', x: 0, y: 2, w: 6, h: 4, ds: { api: 'ops-intelligence/incidents', params: { status: 'open' } }, order: 1 },
    { type: 'anomalies', title: 'Anomalies', x: 6, y: 2, w: 6, h: 4, ds: { api: 'ops-intelligence/anomalies' }, order: 2 },
    { type: 'topology', title: 'Topology layers', x: 0, y: 6, w: 4, h: 3, ds: { api: 'cmdb/topology/layers' }, order: 3 },
    { type: 'signals', title: 'Signals', x: 4, y: 6, w: 4, h: 3, ds: { api: 'ops-intelligence/signals' }, order: 4 },
    { type: 'forecasts', title: 'Forecasts', x: 8, y: 6, w: 4, h: 3, ds: { api: 'ops-intelligence/forecasts' }, order: 5 },
  ];
  for (const s of seeds) {
    await query(
      `INSERT INTO ops_dashboard_widgets
        (tenant_id, dashboard_id, widget_type, title, grid_x, grid_y, grid_w, grid_h, data_source, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [tenantId, dashboardId, s.type, s.title, s.x, s.y, s.w, s.h, JSON.stringify(s.ds), s.order],
    );
  }
}

export async function ensureDefaultDashboard(tenantId: string, createdBy?: string) {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM ops_dashboards WHERE tenant_id = $1 AND is_default = true LIMIT 1`,
    [tenantId],
  );
  if (existing) return getDashboard(tenantId, existing.id);
  return createDashboard(tenantId, {
    name: 'NOC Overview',
    description: 'Default operations dashboard (Wave 6)',
    isDefault: true,
    seedNoc: true,
    createdBy,
  });
}

export async function updateDashboard(
  tenantId: string,
  id: string,
  input: {
    name?: string;
    description?: string;
    refreshSeconds?: number;
    visibility?: string;
    isDefault?: boolean;
  },
) {
  const current = await getDashboard(tenantId, id);
  if (!current) return null;
  if (input.isDefault) {
    await query(`UPDATE ops_dashboards SET is_default = false WHERE tenant_id = $1`, [tenantId]);
  }
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE ops_dashboards SET
      name = COALESCE($3, name),
      description = COALESCE($4, description),
      refresh_seconds = COALESCE($5, refresh_seconds),
      visibility = COALESCE($6, visibility),
      is_default = COALESCE($7, is_default),
      updated_at = NOW()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      tenantId,
      id,
      input.name ?? null,
      input.description ?? null,
      input.refreshSeconds ?? null,
      input.visibility ?? null,
      input.isDefault ?? null,
    ],
  );
  return row ? getDashboard(tenantId, id) : null;
}

export async function deleteDashboard(tenantId: string, id: string) {
  const rows = await query(
    `DELETE FROM ops_dashboards WHERE tenant_id = $1 AND id = $2 RETURNING id`,
    [tenantId, id],
  );
  return rows.length > 0;
}

export async function addWidget(
  tenantId: string,
  dashboardId: string,
  input: {
    widgetType: string;
    title?: string;
    gridX?: number;
    gridY?: number;
    gridW?: number;
    gridH?: number;
    dataSource?: Record<string, unknown>;
    options?: Record<string, unknown>;
    sortOrder?: number;
  },
) {
  const dash = await queryOne(
    `SELECT id FROM ops_dashboards WHERE tenant_id = $1 AND id = $2`,
    [tenantId, dashboardId],
  );
  if (!dash) throw new Error('Dashboard not found');
  const catalog = WIDGET_CATALOG.find((w) => w.type === input.widgetType);
  if (!catalog) throw new Error(`Unknown widget type: ${input.widgetType}`);

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO ops_dashboard_widgets
      (tenant_id, dashboard_id, widget_type, title, grid_x, grid_y, grid_w, grid_h, data_source, options, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      tenantId,
      dashboardId,
      catalog.type,
      input.title ?? catalog.title,
      input.gridX ?? 0,
      input.gridY ?? 0,
      input.gridW ?? catalog.defaultSize.w,
      input.gridH ?? catalog.defaultSize.h,
      JSON.stringify(input.dataSource ?? catalog.defaultDataSource),
      JSON.stringify(input.options ?? {}),
      input.sortOrder ?? 0,
    ],
  );
  await query(`UPDATE ops_dashboards SET updated_at = NOW(), layout_version = layout_version + 1 WHERE id = $1`, [
    dashboardId,
  ]);
  return mapWidget(row!);
}

export async function updateWidget(
  tenantId: string,
  dashboardId: string,
  widgetId: string,
  input: {
    title?: string;
    gridX?: number;
    gridY?: number;
    gridW?: number;
    gridH?: number;
    dataSource?: Record<string, unknown>;
    options?: Record<string, unknown>;
    sortOrder?: number;
  },
) {
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE ops_dashboard_widgets SET
      title = COALESCE($4, title),
      grid_x = COALESCE($5, grid_x),
      grid_y = COALESCE($6, grid_y),
      grid_w = COALESCE($7, grid_w),
      grid_h = COALESCE($8, grid_h),
      data_source = COALESCE($9, data_source),
      options = COALESCE($10, options),
      sort_order = COALESCE($11, sort_order),
      updated_at = NOW()
     WHERE tenant_id = $1 AND dashboard_id = $2 AND id = $3
     RETURNING *`,
    [
      tenantId,
      dashboardId,
      widgetId,
      input.title ?? null,
      input.gridX ?? null,
      input.gridY ?? null,
      input.gridW ?? null,
      input.gridH ?? null,
      input.dataSource ? JSON.stringify(input.dataSource) : null,
      input.options ? JSON.stringify(input.options) : null,
      input.sortOrder ?? null,
    ],
  );
  if (!row) return null;
  await query(`UPDATE ops_dashboards SET updated_at = NOW(), layout_version = layout_version + 1 WHERE id = $1`, [
    dashboardId,
  ]);
  return mapWidget(row);
}

export async function deleteWidget(tenantId: string, dashboardId: string, widgetId: string) {
  const rows = await query(
    `DELETE FROM ops_dashboard_widgets WHERE tenant_id = $1 AND dashboard_id = $2 AND id = $3 RETURNING id`,
    [tenantId, dashboardId, widgetId],
  );
  if (rows.length) {
    await query(`UPDATE ops_dashboards SET updated_at = NOW(), layout_version = layout_version + 1 WHERE id = $1`, [
      dashboardId,
    ]);
  }
  return rows.length > 0;
}

export async function putLayout(
  tenantId: string,
  dashboardId: string,
  widgets: Array<{
    id: string;
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
    sortOrder?: number;
  }>,
) {
  const dash = await getDashboard(tenantId, dashboardId);
  if (!dash) return null;
  for (const w of widgets) {
    await query(
      `UPDATE ops_dashboard_widgets
       SET grid_x = $4, grid_y = $5, grid_w = $6, grid_h = $7,
           sort_order = COALESCE($8, sort_order), updated_at = NOW()
       WHERE tenant_id = $1 AND dashboard_id = $2 AND id = $3`,
      [tenantId, dashboardId, w.id, w.gridX, w.gridY, w.gridW, w.gridH, w.sortOrder ?? null],
    );
  }
  await query(
    `UPDATE ops_dashboards SET updated_at = NOW(), layout_version = layout_version + 1 WHERE tenant_id = $1 AND id = $2`,
    [tenantId, dashboardId],
  );
  return getDashboard(tenantId, dashboardId);
}

export async function addShare(
  tenantId: string,
  dashboardId: string,
  input: { principalType: string; principalId: string; permission?: string },
) {
  const dash = await queryOne(
    `SELECT id FROM ops_dashboards WHERE tenant_id = $1 AND id = $2`,
    [tenantId, dashboardId],
  );
  if (!dash) throw new Error('Dashboard not found');
  const principalType = input.principalType === 'user' ? 'user' : 'role';
  const permission = input.permission === 'edit' ? 'edit' : 'view';
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO ops_dashboard_shares (tenant_id, dashboard_id, principal_type, principal_id, permission)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (dashboard_id, principal_type, principal_id)
     DO UPDATE SET permission = EXCLUDED.permission
     RETURNING *`,
    [tenantId, dashboardId, principalType, input.principalId, permission],
  );
  return {
    id: row!.id,
    principalType: row!.principal_type,
    principalId: row!.principal_id,
    permission: row!.permission,
  };
}

async function fetchJson(url: string, tenantId: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'x-tenant-id': tenantId, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`upstream ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Resolve widget data server-side from Waves 1–5 services.
 */
export async function resolveDashboardData(tenantId: string, dashboardId: string) {
  const dash = await getDashboard(tenantId, dashboardId);
  if (!dash) return null;

  const cmdbUrl = process.env.CMDB_URL ?? 'http://localhost:4002';

  const results = await Promise.all(
    dash.widgets.map(async (w) => {
      const ds = (w.dataSource ?? {}) as { api?: string; params?: Record<string, string> };
      const api = ds.api ?? '';
      try {
        let data: unknown = null;
        if (api === 'ops-intelligence/health') {
          data = await opsIntel.getHealth(tenantId);
        } else if (api === 'ops-intelligence/incidents') {
          data = {
            incidents: await opsIntel.listIncidents(tenantId, {
              status: ds.params?.status,
              limit: 20,
            }),
          };
        } else if (api === 'ops-intelligence/anomalies') {
          data = { anomalies: await opsIntel.listAnomalies(tenantId, 20) };
        } else if (api === 'ops-intelligence/signals') {
          data = { signals: await opsIntel.listSignals(tenantId, 20) };
        } else if (api === 'ops-intelligence/forecasts') {
          data = { forecasts: await opsIntel.listForecasts(tenantId, 20) };
        } else if (api === 'prometheus/samples' || api === 'observability/summary') {
          const samples = await query(
            `SELECT name, value, recorded_at FROM prometheus_samples
             WHERE tenant_id = $1 ORDER BY recorded_at DESC LIMIT 50`,
            [tenantId],
          );
          let hosts: unknown = null;
          try {
            hosts = await monitoring.getHostDashboard(tenantId);
          } catch {
            hosts = null;
          }
          data = { samples, count: samples.length, hosts };
        } else if (api === 'cmdb/topology/layers') {
          data = await fetchJson(`${cmdbUrl}/topology/layers`, tenantId);
        } else if (api === 'cmdb/stats') {
          data = await fetchJson(`${cmdbUrl}/stats`, tenantId);
        } else {
          data = { message: `Unsupported data source: ${api}` };
        }
        return {
          widgetId: String(w.id),
          widgetType: String(w.widgetType),
          title: String(w.title),
          data,
        };
      } catch (err) {
        return {
          widgetId: String(w.id),
          widgetType: String(w.widgetType),
          title: String(w.title),
          data: null,
          error: (err as Error).message,
        };
      }
    }),
  );

  return {
    dashboardId,
    refreshSeconds: dash.refreshSeconds,
    layoutVersion: dash.layoutVersion,
    widgets: results,
    resolvedAt: new Date().toISOString(),
  };
}
