import { query, queryOne } from '@opsedge360/shared-db';
import { parsePrometheusText, type PromSample } from './prometheus-text';

export interface ScrapeTargetRow {
  id: string;
  tenant_id: string;
  name: string;
  job_name: string;
  targets: string[];
  metrics_path: string;
  scrape_interval_seconds: number;
  labels: Record<string, unknown>;
  enabled: boolean;
}

/** Previous CPU idle counters for rate calculation: key = tenant|endpoint */
const cpuIdleCache = new Map<string, { idle: number; total: number; at: number }>();

export async function scrapeEndpoint(
  endpoint: string,
  metricsPath: string,
  timeoutMs = 8000,
): Promise<{ ok: boolean; status?: number; samples: PromSample[]; error?: string; bodyBytes?: number }> {
  const path = metricsPath?.startsWith('/') ? metricsPath : `/${metricsPath || 'metrics'}`;
  const url = endpoint.startsWith('http') ? `${endpoint.replace(/\/$/, '')}${path}` : `http://${endpoint}${path}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/plain;version=0.0.4,application/openmetrics-text' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, samples: [], error: `HTTP ${res.status}`, bodyBytes: text.length };
    }
    const samples = parsePrometheusText(text);
    return { ok: true, status: res.status, samples, bodyBytes: text.length };
  } catch (err) {
    return { ok: false, samples: [], error: (err as Error).message };
  }
}

export function deriveHostMetrics(
  samples: PromSample[],
  endpoint: string,
  cacheKey: string,
): {
  hostname: string;
  cpuPct: number;
  memoryPct: number;
  diskPct: number;
  load1m: number;
  networkInMbps: number;
  networkOutMbps: number;
  status: string;
} {
  const hostname =
    findLabel(samples, 'node_uname_info', 'nodename') ||
    findLabel(samples, 'node_uname_info', 'instance') ||
    endpoint.split(':')[0] ||
    endpoint;

  const memTotal = gauge(samples, 'node_memory_MemTotal_bytes');
  const memAvail = gauge(samples, 'node_memory_MemAvailable_bytes');
  const memFree = gauge(samples, 'node_memory_MemFree_bytes');
  let memoryPct = 0;
  if (memTotal && memTotal > 0) {
    const avail = memAvail ?? memFree ?? 0;
    memoryPct = round1((1 - avail / memTotal) * 100);
  }

  // Prefer root filesystem
  const diskSize = sumMatching(samples, 'node_filesystem_size_bytes', (l) => l.mountpoint === '/' || l.mountpoint === 'C:');
  const diskAvail = sumMatching(samples, 'node_filesystem_avail_bytes', (l) => l.mountpoint === '/' || l.mountpoint === 'C:');
  let diskPct = 0;
  if (diskSize > 0) diskPct = round1((1 - diskAvail / diskSize) * 100);
  if (!diskPct) {
    const anySize = sumMatching(samples, 'node_filesystem_size_bytes', () => true);
    const anyAvail = sumMatching(samples, 'node_filesystem_avail_bytes', () => true);
    if (anySize > 0) diskPct = round1((1 - anyAvail / anySize) * 100);
  }

  const load1m = gauge(samples, 'node_load1') ?? 0;

  // CPU from idle counters (rate between scrapes)
  const idleSum = sumMatching(samples, 'node_cpu_seconds_total', (l) => l.mode === 'idle');
  const totalCpu = sumMatching(samples, 'node_cpu_seconds_total', () => true);
  let cpuPct = 0;
  const prev = cpuIdleCache.get(cacheKey);
  const now = Date.now();
  if (prev && totalCpu > prev.total) {
    const idleDelta = idleSum - prev.idle;
    const totalDelta = totalCpu - prev.total;
    if (totalDelta > 0) cpuPct = round1((1 - idleDelta / totalDelta) * 100);
  }
  cpuIdleCache.set(cacheKey, { idle: idleSum, total: totalCpu, at: now });

  // Fallback: windows_exporter / process exporters
  if (!cpuPct) {
    const winCpu = gauge(samples, 'windows_cpu_time_total');
    if (winCpu != null) cpuPct = Math.min(100, round1(winCpu));
  }

  const up = gauge(samples, 'up');
  const status = up === 0 ? 'down' : 'up';

  return {
    hostname,
    cpuPct: clampPct(cpuPct),
    memoryPct: clampPct(memoryPct),
    diskPct: clampPct(diskPct),
    load1m: round2(load1m),
    networkInMbps: 0,
    networkOutMbps: 0,
    status,
  };
}

export async function persistPromSamples(
  tenantId: string,
  samples: PromSample[],
  meta: { job?: string; instance?: string; source: string },
  limit = 200,
): Promise<number> {
  let n = 0;
  for (const s of samples.slice(0, limit)) {
    await query(
      `INSERT INTO prometheus_samples (tenant_id, name, value, labels, job, instance, source, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [
        tenantId,
        s.name,
        s.value,
        JSON.stringify(s.labels),
        meta.job ?? null,
        meta.instance ?? s.labels.instance ?? null,
        meta.source,
      ],
    );
    n += 1;
  }
  return n;
}

async function writeHostMetric(
  tenantId: string,
  data: {
    hostname: string;
    cpuPct: number;
    memoryPct: number;
    diskPct: number;
    load1m: number;
    networkInMbps: number;
    networkOutMbps: number;
    status: string;
    labels: Record<string, unknown>;
  },
) {
  return queryOne(
    `INSERT INTO host_metrics
      (tenant_id, hostname, cpu_pct, memory_pct, disk_pct, load_1m, network_in_mbps, network_out_mbps, status, labels)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      tenantId,
      data.hostname,
      data.cpuPct,
      data.memoryPct,
      data.diskPct,
      data.load1m,
      data.networkInMbps,
      data.networkOutMbps,
      data.status,
      JSON.stringify(data.labels),
    ],
  );
}

export async function ingestPrometheusSamples(
  tenantId: string,
  samples: PromSample[],
  opts: { job?: string; instance?: string; source: string; writeHostMetrics?: boolean },
) {
  const stored = await persistPromSamples(tenantId, samples, opts, 300);

  let hostMetric = null;
  if (opts.writeHostMetrics !== false && samples.length > 0) {
    const instance = opts.instance || samples[0]?.labels.instance || 'unknown';
    const cacheKey = `${tenantId}|${instance}`;
    const derived = deriveHostMetrics(samples, instance, cacheKey);
    hostMetric = await writeHostMetric(tenantId, {
      hostname: derived.hostname,
      cpuPct: derived.cpuPct,
      memoryPct: derived.memoryPct,
      diskPct: derived.diskPct,
      load1m: derived.load1m,
      networkInMbps: derived.networkInMbps,
      networkOutMbps: derived.networkOutMbps,
      status: derived.status,
      labels: { job: opts.job, source: opts.source, instance },
    });
  }

  return { samplesStored: stored, hostMetric, sampleCount: samples.length };
}

export async function runLiveScrape(tenantId: string, target: ScrapeTargetRow) {
  const results = [];
  let success = 0;
  let failed = 0;

  for (const endpoint of target.targets) {
    const scraped = await scrapeEndpoint(endpoint, target.metrics_path || '/metrics');
    if (!scraped.ok) {
      failed += 1;
      results.push({
        endpoint,
        status: 'error',
        error: scraped.error,
        httpStatus: scraped.status,
        samples: 0,
      });
      continue;
    }

    const cacheKey = `${tenantId}|${endpoint}`;
    const derived = deriveHostMetrics(scraped.samples, endpoint, cacheKey);
    const hostMetric = await writeHostMetric(tenantId, {
      hostname: derived.hostname,
      cpuPct: derived.cpuPct,
      memoryPct: derived.memoryPct,
      diskPct: derived.diskPct,
      load1m: derived.load1m,
      networkInMbps: derived.networkInMbps,
      networkOutMbps: derived.networkOutMbps,
      status: derived.status,
      labels: {
        job: target.job_name,
        instance: endpoint,
        source: 'prometheus-scrape',
        targetId: target.id,
        ...(target.labels as object),
      },
    });

    const stored = await persistPromSamples(
      tenantId,
      scraped.samples,
      { job: target.job_name, instance: endpoint, source: 'scrape' },
      100,
    );

    success += 1;
    results.push({
      endpoint,
      status: 'success',
      samples: scraped.samples.length,
      samplesStored: stored,
      hostMetric,
    });
  }

  const overall = failed === 0 ? 'success' : success === 0 ? 'error' : 'partial';
  await query(
    `UPDATE prometheus_scrape_targets
     SET last_scrape_at = NOW(), last_scrape_status = $2
     WHERE id = $1`,
    [target.id, overall],
  );

  return {
    targetId: target.id,
    status: overall,
    success,
    failed,
    metricsIngested: success,
    results,
    mode: 'live' as const,
  };
}

function gauge(samples: PromSample[], name: string): number | null {
  const s = samples.find((x) => x.name === name);
  return s ? s.value : null;
}

function findLabel(samples: PromSample[], name: string, label: string): string | null {
  const s = samples.find((x) => x.name === name && x.labels[label]);
  return s?.labels[label] ?? null;
}

function sumMatching(
  samples: PromSample[],
  name: string,
  pred: (labels: Record<string, string>) => boolean,
): number {
  return samples
    .filter((s) => s.name === name && pred(s.labels))
    .reduce((a, s) => a + s.value, 0);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}
