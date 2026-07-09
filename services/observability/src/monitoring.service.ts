import { query, queryOne } from '@opsedge360/shared-db';

export interface ScrapeTarget {
  id: string;
  tenant_id: string;
  name: string;
  job_name: string;
  targets: string[];
  metrics_path: string;
  scrape_interval_seconds: number;
  labels: Record<string, unknown>;
  enabled: boolean;
  last_scrape_at: string | null;
  last_scrape_status: string;
}

export interface HostMetric {
  id: string;
  hostname: string;
  cpu_pct: number;
  memory_pct: number;
  disk_pct: number;
  load_1m: number;
  network_in_mbps: number;
  network_out_mbps: number;
  status: string;
  labels: Record<string, unknown>;
  recorded_at: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  metric: string;
  operator: string;
  threshold: number;
  severity: string;
  duration_seconds: number;
  channel_ids: string[];
  enabled: boolean;
  last_evaluated_at: string | null;
  last_fired_at: string | null;
}

export interface NotificationChannel {
  id: string;
  name: string;
  channel_type: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export async function listScrapeTargets(tenantId: string) {
  return query<ScrapeTarget>(
    'SELECT * FROM prometheus_scrape_targets WHERE tenant_id = $1 ORDER BY name',
    [tenantId],
  );
}

export async function createScrapeTarget(
  tenantId: string,
  data: {
    name: string;
    jobName?: string;
    targets: string[];
    metricsPath?: string;
    scrapeIntervalSeconds?: number;
    labels?: Record<string, unknown>;
  },
) {
  return queryOne<ScrapeTarget>(
    `INSERT INTO prometheus_scrape_targets
      (tenant_id, name, job_name, targets, metrics_path, scrape_interval_seconds, labels)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      tenantId,
      data.name,
      data.jobName ?? 'node',
      data.targets,
      data.metricsPath ?? '/metrics',
      data.scrapeIntervalSeconds ?? 30,
      JSON.stringify(data.labels ?? {}),
    ],
  );
}

export async function updateScrapeTarget(
  tenantId: string,
  id: string,
  data: Partial<{
    name: string;
    jobName: string;
    targets: string[];
    metricsPath: string;
    scrapeIntervalSeconds: number;
    enabled: boolean;
    labels: Record<string, unknown>;
  }>,
) {
  return queryOne<ScrapeTarget>(
    `UPDATE prometheus_scrape_targets SET
      name = COALESCE($3, name),
      job_name = COALESCE($4, job_name),
      targets = COALESCE($5, targets),
      metrics_path = COALESCE($6, metrics_path),
      scrape_interval_seconds = COALESCE($7, scrape_interval_seconds),
      enabled = COALESCE($8, enabled),
      labels = CASE WHEN $9::text IS NULL THEN labels ELSE $9::jsonb END
     WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [
      tenantId,
      id,
      data.name ?? null,
      data.jobName ?? null,
      data.targets ?? null,
      data.metricsPath ?? null,
      data.scrapeIntervalSeconds ?? null,
      data.enabled ?? null,
      data.labels ? JSON.stringify(data.labels) : null,
    ],
  );
}

export async function deleteScrapeTarget(tenantId: string, id: string) {
  const rows = await query(
    'DELETE FROM prometheus_scrape_targets WHERE tenant_id = $1 AND id = $2 RETURNING id',
    [tenantId, id],
  );
  return rows.length > 0;
}

/** Live Prometheus scrape (HTTP pull of /metrics). Falls back to synthetic only if PROMETHEUS_SCRAPE_FALLBACK=synthetic. */
export async function runScrape(tenantId: string, targetId: string) {
  const target = await queryOne<ScrapeTarget>(
    'SELECT * FROM prometheus_scrape_targets WHERE tenant_id = $1 AND id = $2 AND enabled = true',
    [tenantId, targetId],
  );
  if (!target) throw new Error('Target not found or disabled');

  const { runLiveScrape } = await import('./prometheus-scrape');
  try {
    return await runLiveScrape(tenantId, {
      ...target,
      tenant_id: tenantId,
      labels: (target.labels ?? {}) as Record<string, unknown>,
    });
  } catch (err) {
    if (process.env.PROMETHEUS_SCRAPE_FALLBACK !== 'synthetic') throw err;
  }

  // Optional lab fallback
  const hostMetrics = [];
  for (const endpoint of target.targets) {
    const hostname = endpoint.split(':')[0] || endpoint;
    const metric = await ingestHostMetric(tenantId, {
      hostname,
      cpuPct: 20 + Math.random() * 60,
      memoryPct: 30 + Math.random() * 50,
      diskPct: 40 + Math.random() * 40,
      load1m: Math.random() * 4,
      networkInMbps: Math.random() * 100,
      networkOutMbps: Math.random() * 80,
      status: 'up',
      labels: { job: target.job_name, source: 'synthetic-fallback', ...(target.labels as object) },
    });
    hostMetrics.push(metric);
  }

  await query(
    `UPDATE prometheus_scrape_targets
     SET last_scrape_at = NOW(), last_scrape_status = 'synthetic'
     WHERE id = $1`,
    [targetId],
  );

  return { targetId, status: 'synthetic', metricsIngested: hostMetrics.length, hostMetrics, mode: 'synthetic' as const };
}

/** Scrape all enabled targets for a tenant (scheduler). */
export async function runAllScrapes(tenantId: string) {
  const targets = await listScrapeTargets(tenantId);
  const results = [];
  for (const t of targets.filter((x) => x.enabled)) {
    try {
      results.push(await runScrape(tenantId, t.id));
    } catch (err) {
      results.push({ targetId: t.id, status: 'error', error: (err as Error).message });
    }
  }
  return results;
}

export async function ingestHostMetric(
  tenantId: string,
  data: {
    hostname: string;
    cpuPct?: number;
    memoryPct?: number;
    diskPct?: number;
    load1m?: number;
    networkInMbps?: number;
    networkOutMbps?: number;
    status?: string;
    labels?: Record<string, unknown>;
  },
) {
  return queryOne<HostMetric>(
    `INSERT INTO host_metrics
      (tenant_id, hostname, cpu_pct, memory_pct, disk_pct, load_1m, network_in_mbps, network_out_mbps, status, labels)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      tenantId,
      data.hostname,
      data.cpuPct ?? 0,
      data.memoryPct ?? 0,
      data.diskPct ?? 0,
      data.load1m ?? 0,
      data.networkInMbps ?? 0,
      data.networkOutMbps ?? 0,
      data.status ?? 'up',
      JSON.stringify(data.labels ?? {}),
    ],
  );
}

export async function listLatestHosts(tenantId: string) {
  return query<HostMetric>(
    `SELECT DISTINCT ON (hostname) *
     FROM host_metrics
     WHERE tenant_id = $1
     ORDER BY hostname, recorded_at DESC`,
    [tenantId],
  );
}

export async function getHostDashboard(tenantId: string) {
  const hosts = await listLatestHosts(tenantId);
  const avg = (key: keyof HostMetric) =>
    hosts.length
      ? Math.round((hosts.reduce((s, h) => s + Number(h[key] ?? 0), 0) / hosts.length) * 10) / 10
      : 0;

  return {
    totalHosts: hosts.length,
    upHosts: hosts.filter((h) => h.status === 'up').length,
    downHosts: hosts.filter((h) => h.status !== 'up').length,
    avgCpu: avg('cpu_pct'),
    avgMemory: avg('memory_pct'),
    avgDisk: avg('disk_pct'),
    hosts: hosts.map((h) => ({
      id: h.id,
      hostname: h.hostname,
      cpuPct: Number(h.cpu_pct),
      memoryPct: Number(h.memory_pct),
      diskPct: Number(h.disk_pct),
      load1m: Number(h.load_1m),
      networkInMbps: Number(h.network_in_mbps),
      networkOutMbps: Number(h.network_out_mbps),
      status: h.status,
      recordedAt: h.recorded_at,
    })),
  };
}

export async function listChannels(tenantId: string) {
  return query<NotificationChannel>(
    'SELECT * FROM notification_channels WHERE tenant_id = $1 ORDER BY name',
    [tenantId],
  );
}

export async function createChannel(
  tenantId: string,
  data: { name: string; channelType: string; config?: Record<string, unknown> },
) {
  return queryOne<NotificationChannel>(
    `INSERT INTO notification_channels (tenant_id, name, channel_type, config)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [tenantId, data.name, data.channelType, JSON.stringify(data.config ?? {})],
  );
}

export async function deleteChannel(tenantId: string, id: string) {
  const rows = await query(
    'DELETE FROM notification_channels WHERE tenant_id = $1 AND id = $2 RETURNING id',
    [tenantId, id],
  );
  return rows.length > 0;
}

export async function listAlertRules(tenantId: string) {
  return query<AlertRule>(
    'SELECT * FROM alert_rules WHERE tenant_id = $1 ORDER BY name',
    [tenantId],
  );
}

export async function createAlertRule(
  tenantId: string,
  data: {
    name: string;
    description?: string;
    metric: string;
    operator?: string;
    threshold: number;
    severity?: string;
    durationSeconds?: number;
    channelIds?: string[];
  },
) {
  return queryOne<AlertRule>(
    `INSERT INTO alert_rules
      (tenant_id, name, description, metric, operator, threshold, severity, duration_seconds, channel_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      tenantId,
      data.name,
      data.description ?? null,
      data.metric,
      data.operator ?? 'gt',
      data.threshold,
      data.severity ?? 'warning',
      data.durationSeconds ?? 60,
      data.channelIds ?? [],
    ],
  );
}

export async function updateAlertRule(
  tenantId: string,
  id: string,
  data: Partial<{
    name: string;
    description: string;
    metric: string;
    operator: string;
    threshold: number;
    severity: string;
    enabled: boolean;
    channelIds: string[];
  }>,
) {
  return queryOne<AlertRule>(
    `UPDATE alert_rules SET
      name = COALESCE($3, name),
      description = COALESCE($4, description),
      metric = COALESCE($5, metric),
      operator = COALESCE($6, operator),
      threshold = COALESCE($7, threshold),
      severity = COALESCE($8, severity),
      enabled = COALESCE($9, enabled),
      channel_ids = COALESCE($10, channel_ids)
     WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [
      tenantId,
      id,
      data.name ?? null,
      data.description ?? null,
      data.metric ?? null,
      data.operator ?? null,
      data.threshold ?? null,
      data.severity ?? null,
      data.enabled ?? null,
      data.channelIds ?? null,
    ],
  );
}

export async function deleteAlertRule(tenantId: string, id: string) {
  const rows = await query('DELETE FROM alert_rules WHERE tenant_id = $1 AND id = $2 RETURNING id', [
    tenantId,
    id,
  ]);
  return rows.length > 0;
}

export async function listAlertEvents(tenantId: string, limit = 50) {
  return query(
    `SELECT * FROM alert_events WHERE tenant_id = $1 ORDER BY fired_at DESC LIMIT $2`,
    [tenantId, limit],
  );
}

function compare(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'gt':
      return value > threshold;
    case 'gte':
      return value >= threshold;
    case 'lt':
      return value < threshold;
    case 'lte':
      return value <= threshold;
    case 'eq':
      return value === threshold;
    default:
      return value > threshold;
  }
}

function metricValue(host: HostMetric, metric: string): number | null {
  switch (metric) {
    case 'cpu_pct':
      return Number(host.cpu_pct);
    case 'memory_pct':
      return Number(host.memory_pct);
    case 'disk_pct':
      return Number(host.disk_pct);
    case 'load_1m':
      return Number(host.load_1m);
    case 'network_in_mbps':
      return Number(host.network_in_mbps);
    case 'network_out_mbps':
      return Number(host.network_out_mbps);
    default:
      return null;
  }
}

export async function evaluateAlertRules(tenantId: string) {
  const rules = (await listAlertRules(tenantId)).filter((r) => r.enabled);
  const hosts = await listLatestHosts(tenantId);
  const channels = await listChannels(tenantId);
  const channelMap = new Map(channels.map((c) => [c.id, c]));
  const fired = [];

  for (const rule of rules) {
    await query('UPDATE alert_rules SET last_evaluated_at = NOW() WHERE id = $1', [rule.id]);

    for (const host of hosts) {
      const value = metricValue(host, rule.metric);
      if (value == null) continue;
      if (!compare(value, rule.operator, Number(rule.threshold))) continue;

      const notified = (rule.channel_ids ?? []).filter((id) => channelMap.get(id)?.enabled);
      const event = await queryOne(
        `INSERT INTO alert_events
          (tenant_id, rule_id, title, message, severity, status, metric_value, labels, notified_channels)
         VALUES ($1,$2,$3,$4,$5,'firing',$6,$7,$8) RETURNING *`,
        [
          tenantId,
          rule.id,
          `${rule.name}: ${host.hostname}`,
          `${rule.metric} is ${value} (threshold ${rule.operator} ${rule.threshold}) on ${host.hostname}`,
          rule.severity,
          value,
          JSON.stringify({ hostname: host.hostname, metric: rule.metric }),
          notified,
        ],
      );

      // Record notification delivery (in-app / webhook log)
      for (const channelId of notified) {
        const ch = channelMap.get(channelId);
        if (!ch) continue;
        console.log(
          `[alert] notify ${ch.channel_type}:${ch.name} — ${rule.name} on ${host.hostname} value=${value}`,
        );
      }

      await query('UPDATE alert_rules SET last_fired_at = NOW() WHERE id = $1', [rule.id]);
      await query(
        `INSERT INTO alerts (tenant_id, severity, title, description, status)
         VALUES ($1,$2,$3,$4,'open')`,
        [
          tenantId,
          rule.severity,
          `${rule.name}: ${host.hostname}`,
          `${rule.metric}=${value} ${rule.operator} ${rule.threshold}`,
        ],
      );

      fired.push(event);
    }
  }

  return { evaluated: rules.length, fired: fired.length, events: fired };
}

export function toPrometheusConfig(targets: ScrapeTarget[]) {
  const apiBase = process.env.OBS360_PUBLIC_API_URL
    || process.env.NEXT_PUBLIC_API_URL
    || 'http://localhost:4000';

  return {
    global: { scrape_interval: '30s' },
    // OpsEdge360 also pulls these targets live (POST .../scrape-targets/:id/scrape)
    scrape_configs: targets
      .filter((t) => t.enabled)
      .map((t) => ({
        job_name: t.job_name,
        metrics_path: t.metrics_path,
        scrape_interval: `${t.scrape_interval_seconds}s`,
        static_configs: [
          {
            targets: t.targets,
            labels: t.labels,
          },
        ],
      })),
    // Push path: send exposition text/JSON to OpsEdge360
    remote_write_note: {
      url: `${apiBase}/api/v1/observability/prometheus/write`,
      auth: 'Bearer <JWT>',
      content_types: ['application/json', 'text/plain via metrics field'],
      example_json: {
        job: 'node',
        instance: 'host:9100',
        metrics: 'node_load1 0.42\nnode_memory_MemTotal_bytes 8e9\nnode_memory_MemAvailable_bytes 4e9\n',
      },
    },
  };
}
