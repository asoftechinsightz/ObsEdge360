import express from 'express';
import { query, closePool } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';
import * as monitoring from './monitoring.service';
import * as apm from './apm.service';
import * as pipeline from './telemetry-pipeline.service';

const app = express();

// OTLP HTTP endpoints accept protobuf or JSON; Prometheus text for remote_write
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: ['text/plain', 'application/openmetrics-text', 'text/*'], limit: '10mb' }));

const recentMetrics: apm.MetricPoint[] = [];
const recentLogs: apm.LogRecord[] = [];
const recentSpans: apm.SpanRecord[] = [];

const ingestCounts = new Map<string, { count: number; resetAt: number }>();
const INGEST_LIMIT_PER_MIN = Number(process.env.OTLP_RATE_LIMIT ?? 120);

function rateLimitOk(tenantId: string): boolean {
  const now = Date.now();
  const entry = ingestCounts.get(tenantId);
  if (!entry || entry.resetAt < now) {
    ingestCounts.set(tenantId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= INGEST_LIMIT_PER_MIN;
}

let bus: EventBus | null = null;
function getBus() {
  if (!bus) bus = new EventBus('observability-service');
  return bus;
}

async function resolveTenant(req: express.Request): Promise<string> {
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  return resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
}

app.get('/health', (_, res) => {
  res.json({
    status: 'healthy',
    service: 'observability',
    metricsBuffered: recentMetrics.length,
    logsBuffered: recentLogs.length,
    spansBuffered: recentSpans.length,
  });
});

app.get('/ready', (_, res) => res.json({ status: 'ready', service: 'observability', version: '1.0.0' }));
app.get('/live', (_, res) => res.json({ status: 'live', service: 'observability', version: '1.0.0' }));
app.get('/version', (_, res) => {
  res.json({ service: 'observability', version: '1.0.0', platform: 'OpsEdge360', node: process.version });
});
app.get('/metrics', (_, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(
    [
      `# HELP otlp_logs_buffered Buffered OTLP logs`,
      `# TYPE otlp_logs_buffered gauge`,
      `otlp_logs_buffered{service="observability"} ${recentLogs.length}`,
      `service_up{service="observability"} 1`,
      '',
    ].join('\n'),
  );
});

app.get('/pipeline/sources', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    res.json({ sources: await pipeline.listSources(tenantId) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/pipeline/sources', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    const source = await pipeline.registerSource(tenantId, req.body);
    res.status(201).json(source);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/pipeline/ingest/:sourceId', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    const sourceId = Array.isArray(req.params.sourceId) ? req.params.sourceId[0] : req.params.sourceId;
    const result = await pipeline.ingestFromSource(tenantId, sourceId, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** OTLP metrics HTTP/JSON — validated, rate-limited, persisted */
app.post('/v1/metrics', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    if (!rateLimitOk(tenantId)) {
      return res.status(429).json({ error: 'OTLP rate limit exceeded' });
    }
    const metrics = apm.extractMetrics(req.body);
    if (metrics.length === 0) {
      return res.status(400).json({ error: 'No metrics found in payload' });
    }

    recentMetrics.push(...metrics);
    if (recentMetrics.length > 10000) recentMetrics.splice(0, recentMetrics.length - 10000);

    const persisted = await apm.persistMetrics(tenantId, metrics);
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(
      TOPICS.TELEMETRY_RECEIVED,
      createEvent('telemetry.metrics', tenantId, { count: persisted }),
    );

    res.json({ partialSuccess: {}, metricsReceived: persisted });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** OTLP logs HTTP/JSON */
app.post('/v1/logs', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    if (!rateLimitOk(tenantId)) {
      return res.status(429).json({ error: 'OTLP rate limit exceeded' });
    }
    const logs = apm.extractLogs(req.body);
    if (logs.length === 0) {
      return res.status(400).json({ error: 'No logs found in payload' });
    }

    recentLogs.push(...logs);
    if (recentLogs.length > 10000) recentLogs.splice(0, recentLogs.length - 10000);

    const persisted = await apm.persistLogs(tenantId, logs);
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(
      TOPICS.TELEMETRY_RECEIVED,
      createEvent('telemetry.logs', tenantId, { count: persisted }),
    );

    res.json({ partialSuccess: {}, logsReceived: persisted });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** OTLP traces HTTP/JSON */
app.post('/v1/traces', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    if (!rateLimitOk(tenantId)) {
      return res.status(429).json({ error: 'OTLP rate limit exceeded' });
    }
    const spans = apm.extractSpans(req.body);
    if (spans.length === 0) {
      return res.status(400).json({ error: 'No spans found in payload' });
    }

    recentSpans.push(...spans);
    if (recentSpans.length > 5000) recentSpans.splice(0, recentSpans.length - 5000);

    const persisted = await apm.persistSpans(tenantId, spans);
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(
      TOPICS.TELEMETRY_RECEIVED,
      createEvent('telemetry.traces', tenantId, { count: persisted }),
    );

    res.json({ partialSuccess: {}, spansReceived: persisted });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/metrics/summary', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    const summary = await apm.getTelemetrySummary(tenantId);
    res.json({
      ...summary,
      latestMetrics: recentMetrics.slice(-20),
      latestLogs: recentLogs.slice(-10),
      buffer: {
        metrics: recentMetrics.length,
        logs: recentLogs.length,
        spans: recentSpans.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Sprint 6: APM ---
app.get('/apm/service-map', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    const hours = Number(req.query.hours ?? 1);
    res.json(await apm.buildServiceMap(tenantId, hours));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/apm/traces', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    res.json(await apm.listTraces(tenantId, Number(req.query.limit ?? 20)));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/apm/traces/:traceId', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    const traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : req.params.traceId;
    res.json(await apm.getTrace(tenantId, traceId));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/apm/logs', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    res.json(
      await apm.searchLogs(tenantId, {
        q: req.query.q as string | undefined,
        severity: req.query.severity as string | undefined,
        service: req.query.service as string | undefined,
        traceId: req.query.traceId as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      }),
    );
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/apm/summary', async (req, res) => {
  try {
    const tenantId = await resolveTenant(req);
    const [telemetry, serviceMap] = await Promise.all([
      apm.getTelemetrySummary(tenantId),
      apm.buildServiceMap(tenantId, 1),
    ]);
    res.json({ telemetry, services: serviceMap.nodes.length, edges: serviceMap.edges.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Update CI health scores from telemetry (Phase 1 heuristic) */
app.post('/health-score/sync', async (req, res) => {
  const tenantId = (req.headers['x-tenant-id'] as string) ?? 'default';
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  const tid = await resolveTenantId(tenantId);

  // Simple: lower health if error logs mention CI name
  const cis = await query<{ id: string; name: string; health_score: number }>(
    'SELECT id, name, health_score FROM configuration_items WHERE tenant_id = $1',
    [tid],
  );

  let updated = 0;
  for (const ci of cis) {
    const errorLogs = recentLogs.filter(
      (l) => l.severity === 'ERROR' && l.body.toLowerCase().includes(ci.name.toLowerCase()),
    );
    if (errorLogs.length > 0) {
      const newScore = Math.max(50, ci.health_score - errorLogs.length * 5);
      await query(
        'UPDATE configuration_items SET health_score = $2, updated_at = NOW() WHERE id = $1',
        [ci.id, newScore],
      );
      updated++;
    }
  }

  res.json({ updated });
});

/** NetFlow / IPFIX flow ingestion (Phase 2) */
app.post('/network/flows', async (req, res) => {
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  const tenantId = await resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
  const flows = Array.isArray(req.body?.flows) ? req.body.flows : [req.body];
  let inserted = 0;

  for (const f of flows) {
    await query(
      `INSERT INTO network_flows (tenant_id, src_ip, dst_ip, src_port, dst_port, protocol, bytes, packets, latency_ms, jitter_ms, packet_loss_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        tenantId, f.srcIp ?? f.src_ip, f.dstIp ?? f.dst_ip,
        f.srcPort ?? f.src_port, f.dstPort ?? f.dst_port,
        f.protocol ?? 'TCP', f.bytes ?? 0, f.packets ?? 0,
        f.latencyMs ?? f.latency_ms, f.jitterMs ?? f.jitter_ms, f.packetLossPct ?? f.packet_loss_pct,
      ],
    );
    inserted++;
  }

  const eventBus = getBus();
  await eventBus.connect();
  await eventBus.publish(TOPICS.NETWORK_FLOW, createEvent('network.flow', tenantId, { count: inserted }));

  res.json({ flowsReceived: inserted });
});

app.get('/network/flows', async (req, res) => {
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  const tenantId = await resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
  const rows = await query(
    `SELECT * FROM network_flows WHERE tenant_id = $1 ORDER BY recorded_at DESC LIMIT 100`,
    [tenantId],
  );
  res.json({ flows: rows });
});

app.get('/network/summary', async (req, res) => {
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  const tenantId = await resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
  const row = await query(
    `SELECT COUNT(*) as total_flows,
      COALESCE(AVG(latency_ms), 0) as avg_latency,
      COALESCE(SUM(bytes), 0) as total_bytes
     FROM network_flows WHERE tenant_id = $1 AND recorded_at > NOW() - INTERVAL '1 hour'`,
    [tenantId],
  );
  res.json(row[0] ?? { total_flows: 0, avg_latency: 0, total_bytes: 0 });
});

/** SNMP interface metrics ingestion */
app.post('/network/snmp/metrics', async (req, res) => {
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  const tenantId = await resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
  const metrics = Array.isArray(req.body?.metrics) ? req.body.metrics : [req.body];
  for (const m of metrics) {
    await query(
      `INSERT INTO network_interface_metrics (tenant_id, ci_id, interface_name, utilization_pct, in_mbps, out_mbps, errors)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tenantId, m.ciId, m.interfaceName, m.utilizationPct, m.inMbps, m.outMbps, m.errors ?? 0],
    );
  }
  res.json({ metricsReceived: metrics.length });
});

/** Sustainability Intelligence (Phase 3) */
app.get('/sustainability/summary', async (req, res) => {
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  const tenantId = await resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
  const row = await query(
    `SELECT COALESCE(SUM(energy_kwh), 0) as total_energy,
      COALESCE(SUM(carbon_kg), 0) as total_carbon,
      COALESCE(AVG(pue), 1.5) as avg_pue,
      COALESCE(AVG(renewable_pct), 0) as avg_renewable,
      COALESCE(SUM(idle_resources), 0) as idle_resources,
      COALESCE(AVG(efficiency_score), 70) as efficiency_score
     FROM sustainability_rollups WHERE tenant_id = $1 AND period_date >= CURRENT_DATE - 7`,
    [tenantId],
  );
  res.json(row[0] ?? {});
});

app.get('/sustainability/recommendations', async (req, res) => {
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  const tenantId = await resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
  const rows = await query(
    'SELECT * FROM sustainability_recommendations WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC',
    [tenantId, 'pending'],
  );
  res.json({ recommendations: rows });
});

app.get('/sustainability/rollups', async (req, res) => {
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  const tenantId = await resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
  const rows = await query(
    'SELECT * FROM sustainability_rollups WHERE tenant_id = $1 ORDER BY period_date DESC LIMIT 30',
    [tenantId],
  );
  res.json({ rollups: rows });
});

async function tenantIdFrom(req: express.Request): Promise<string> {
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  return resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
}

function paramId(req: express.Request, name = 'id'): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

// --- Sprint 5: Prometheus scrape targets ---
app.get('/scrape-targets', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const targets = await monitoring.listScrapeTargets(tenantId);
    res.json({ targets, prometheusConfig: monitoring.toPrometheusConfig(targets) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/scrape-targets', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const body = req.body;
    const targets = Array.isArray(body.targets)
      ? body.targets
      : String(body.targets ?? '')
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);
    const row = await monitoring.createScrapeTarget(tenantId, {
      name: body.name,
      jobName: body.jobName ?? body.job_name,
      targets,
      metricsPath: body.metricsPath ?? body.metrics_path,
      scrapeIntervalSeconds: body.scrapeIntervalSeconds ?? body.scrape_interval_seconds,
      labels: body.labels,
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.patch('/scrape-targets/:id', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const body = req.body;
    const row = await monitoring.updateScrapeTarget(tenantId, paramId(req), {
      name: body.name,
      jobName: body.jobName ?? body.job_name,
      targets: body.targets,
      metricsPath: body.metricsPath ?? body.metrics_path,
      scrapeIntervalSeconds: body.scrapeIntervalSeconds ?? body.scrape_interval_seconds,
      enabled: body.enabled,
      labels: body.labels,
    });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/scrape-targets/:id', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const ok = await monitoring.deleteScrapeTarget(tenantId, paramId(req));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/scrape-targets/:id/scrape', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const result = await monitoring.runScrape(tenantId, paramId(req));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/scrape-targets/scrape-all', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const results = await monitoring.runAllScrapes(tenantId);
    res.json({ results });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * Prometheus remote_write compatible ingest (text exposition or JSON).
 * Native Prometheus protobuf+snappy can be fronted by Vector/Grafana Agent → text/JSON here,
 * or scrape targets can be pulled live by OpsEdge360.
 *
 * Text:  Content-Type: text/plain
 * JSON:  { "timeseries": [ { "labels": {"__name__":"up","instance":"host:9100"}, "samples":[{"value":1}] } ] }
 *        or { "metrics": "prometheus text..." }
 */
app.post('/prometheus/remote_write', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const prom = await import('./prometheus-text');
    const scrape = await import('./prometheus-scrape');

    let samples = prom.parsePrometheusText('');
    const ct = String(req.headers['content-type'] || '');

    if (ct.includes('text/plain') || ct.includes('openmetrics') || typeof req.body === 'string') {
      const text = typeof req.body === 'string' ? req.body : String(req.body ?? '');
      samples = prom.parsePrometheusText(text);
    } else if (req.body?.metrics && typeof req.body.metrics === 'string') {
      samples = prom.parsePrometheusText(req.body.metrics);
    } else if (Array.isArray(req.body?.timeseries)) {
      samples = [];
      for (const ts of req.body.timeseries) {
        const labels = { ...(ts.labels || {}) };
        const name = labels.__name__ || ts.name || 'unknown';
        delete labels.__name__;
        for (const s of ts.samples || []) {
          samples.push({
            name,
            value: Number(s.value),
            labels,
            timestampMs: s.timestamp,
          });
        }
      }
    } else if (Array.isArray(req.body?.samples)) {
      samples = req.body.samples;
    } else {
      return res.status(415).json({
        error: 'Unsupported payload. Send Prometheus text/plain or JSON timeseries.',
      });
    }

    if (!samples.length) {
      return res.status(400).json({ error: 'No samples parsed' });
    }

    const instance = (req.query.instance as string) || samples[0]?.labels?.instance;
    const job = (req.query.job as string) || samples[0]?.labels?.job || 'remote_write';
    const result = await scrape.ingestPrometheusSamples(tenantId, samples, {
      job,
      instance,
      source: 'remote_write',
    });

    if (req.headers.accept?.includes('application/json')) {
      return res.json(result);
    }
    // Prometheus remote_write clients expect 2xx with empty body
    return res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// JSON-friendly remote write (always returns body)
app.post('/prometheus/write', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const prom = await import('./prometheus-text');
    const scrape = await import('./prometheus-scrape');

    let samples = [] as ReturnType<typeof prom.parsePrometheusText>;
    if (typeof req.body === 'string') {
      samples = prom.parsePrometheusText(req.body);
    } else if (req.body?.metrics && typeof req.body.metrics === 'string') {
      samples = prom.parsePrometheusText(req.body.metrics);
    } else if (Array.isArray(req.body?.timeseries)) {
      for (const ts of req.body.timeseries) {
        const labels = { ...(ts.labels || {}) };
        const name = labels.__name__ || ts.name || 'unknown';
        delete labels.__name__;
        for (const s of ts.samples || [{ value: ts.value }]) {
          samples.push({ name, value: Number(s.value ?? 0), labels, timestampMs: s.timestamp });
        }
      }
    } else {
      return res.status(400).json({ error: 'Provide metrics text or timeseries[]' });
    }

    const result = await scrape.ingestPrometheusSamples(tenantId, samples, {
      job: req.body?.job || req.query.job,
      instance: req.body?.instance || req.query.instance,
      source: 'remote_write',
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/prometheus/samples', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const limit = Math.min(Number(req.query.limit ?? 50), 500);
    const name = req.query.name as string | undefined;
    const params: unknown[] = [tenantId];
    let sql = `SELECT name, value, labels, job, instance, source, recorded_at
               FROM prometheus_samples WHERE tenant_id = $1`;
    if (name) {
      params.push(name);
      sql += ` AND name = $2`;
    }
    params.push(limit);
    sql += ` ORDER BY recorded_at DESC LIMIT $${params.length}`;
    const { query } = await import('@opsedge360/shared-db');
    const rows = await query(sql, params);
    res.json({ samples: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// --- Host metrics / dashboard ---
app.get('/hosts', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    res.json(await monitoring.getHostDashboard(tenantId));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/hosts/metrics', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const items = Array.isArray(req.body?.hosts) ? req.body.hosts : [req.body];
    const inserted = [];
    for (const h of items) {
      inserted.push(
        await monitoring.ingestHostMetric(tenantId, {
          hostname: h.hostname,
          cpuPct: h.cpuPct ?? h.cpu_pct,
          memoryPct: h.memoryPct ?? h.memory_pct,
          diskPct: h.diskPct ?? h.disk_pct,
          load1m: h.load1m ?? h.load_1m,
          networkInMbps: h.networkInMbps ?? h.network_in_mbps,
          networkOutMbps: h.networkOutMbps ?? h.network_out_mbps,
          status: h.status,
          labels: h.labels,
        }),
      );
    }
    res.status(201).json({ ingested: inserted.length, hosts: inserted });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// --- Notification channels ---
app.get('/channels', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    res.json({ channels: await monitoring.listChannels(tenantId) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/channels', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const row = await monitoring.createChannel(tenantId, {
      name: req.body.name,
      channelType: req.body.channelType ?? req.body.channel_type,
      config: req.body.config,
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/channels/:id', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const ok = await monitoring.deleteChannel(tenantId, paramId(req));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// --- Alert rules ---
app.get('/alert-rules', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    res.json({ rules: await monitoring.listAlertRules(tenantId) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/alert-rules', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const body = req.body;
    const row = await monitoring.createAlertRule(tenantId, {
      name: body.name,
      description: body.description,
      metric: body.metric,
      operator: body.operator,
      threshold: Number(body.threshold),
      severity: body.severity,
      durationSeconds: body.durationSeconds ?? body.duration_seconds,
      channelIds: body.channelIds ?? body.channel_ids,
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.patch('/alert-rules/:id', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const body = req.body;
    const row = await monitoring.updateAlertRule(tenantId, paramId(req), {
      name: body.name,
      description: body.description,
      metric: body.metric,
      operator: body.operator,
      threshold: body.threshold != null ? Number(body.threshold) : undefined,
      severity: body.severity,
      enabled: body.enabled,
      channelIds: body.channelIds ?? body.channel_ids,
    });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/alert-rules/:id', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const ok = await monitoring.deleteAlertRule(tenantId, paramId(req));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/alert-rules/evaluate', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    res.json(await monitoring.evaluateAlertRules(tenantId));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/alert-events', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    res.json({ events: await monitoring.listAlertEvents(tenantId) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/infra/summary', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const hosts = await monitoring.getHostDashboard(tenantId);
    const targets = await monitoring.listScrapeTargets(tenantId);
    const rules = await monitoring.listAlertRules(tenantId);
    const events = await monitoring.listAlertEvents(tenantId, 10);
    const net = await query(
      `SELECT COUNT(*) as total_flows,
        COALESCE(AVG(latency_ms), 0) as avg_latency,
        COALESCE(SUM(bytes), 0) as total_bytes
       FROM network_flows WHERE tenant_id = $1 AND recorded_at > NOW() - INTERVAL '1 hour'`,
      [tenantId],
    );
    res.json({
      hosts,
      scrapeTargets: targets.length,
      enabledTargets: targets.filter((t) => t.enabled).length,
      alertRules: rules.length,
      recentAlerts: events.length,
      network: net[0] ?? { total_flows: 0, avg_latency: 0, total_bytes: 0 },
      telemetry: {
        totalMetrics: recentMetrics.length,
        totalLogs: recentLogs.length,
        totalSpans: recentSpans.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Periodic live scrape of all enabled Prometheus targets (all tenants). */
const SCRAPE_SCHEDULER_MS = Number(process.env.PROMETHEUS_SCRAPE_SCHEDULER_MS ?? 30_000);
if (process.env.PROMETHEUS_SCRAPE_SCHEDULER !== 'false') {
  setInterval(async () => {
    try {
      const tenants = await query<{ id: string }>('SELECT id FROM tenants');
      for (const t of tenants) {
        await monitoring.runAllScrapes(t.id);
      }
    } catch (err) {
      console.warn('[prometheus] scheduled scrape:', (err as Error).message);
    }
  }, SCRAPE_SCHEDULER_MS);
  console.log(`[prometheus] live scrape scheduler every ${SCRAPE_SCHEDULER_MS}ms`);
}

const port = Number(process.env.OBSERVABILITY_PORT ?? 4003);
app.listen(port, () => console.log(`Observability service on :${port} (OTLP / Prometheus scrape / remote_write)`));

process.on('SIGTERM', async () => {
  await getBus().disconnect();
  await closePool();
  process.exit(0);
});
