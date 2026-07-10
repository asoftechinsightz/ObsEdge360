import { query, queryOne } from '@opsedge360/shared-db';
import { createHash } from 'crypto';

export type TelemetrySourceType =
  | 'windows-event-log'
  | 'linux-journald'
  | 'syslog'
  | 'application-log'
  | 'nginx'
  | 'apache'
  | 'tomcat'
  | 'weblogic'
  | 'jboss'
  | 'oracle'
  | 'mysql'
  | 'postgresql'
  | 'mongodb'
  | 'kafka'
  | 'redis'
  | 'rabbitmq'
  | 'kubernetes-logs'
  | 'docker-logs'
  | 'aws-cloudwatch'
  | 'azure-monitor'
  | 'gcp-operations';

export interface TelemetrySource {
  id: string;
  tenant_id: string;
  name: string;
  source_type: TelemetrySourceType;
  config: Record<string, unknown>;
  enabled: boolean;
  last_ingest_at: string | null;
}

export interface NormalizedLogRecord {
  timestamp: string;
  body: string;
  severity: string;
  source: string;
  attributes: Record<string, unknown>;
}

export async function listSources(tenantId: string): Promise<TelemetrySource[]> {
  return query<TelemetrySource>(
    'SELECT * FROM telemetry_sources WHERE tenant_id = $1 ORDER BY name',
    [tenantId],
  );
}

export async function registerSource(
  tenantId: string,
  data: { name: string; sourceType: TelemetrySourceType; config?: Record<string, unknown> },
): Promise<TelemetrySource> {
  const row = await queryOne<TelemetrySource>(
    `INSERT INTO telemetry_sources (tenant_id, name, source_type, config)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [tenantId, data.name, data.sourceType, JSON.stringify(data.config ?? {})],
  );
  if (!row) throw new Error('Failed to register telemetry source');
  return row;
}

function parseSyslogLine(line: string): NormalizedLogRecord {
  return {
    timestamp: new Date().toISOString(),
    body: line,
    severity: line.includes('error') || line.includes('ERR') ? 'error' : 'info',
    source: 'syslog',
    attributes: { raw: line },
  };
}

function parseJsonLogLine(line: string, source: string): NormalizedLogRecord {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    return {
      timestamp: String(parsed.timestamp ?? parsed['@timestamp'] ?? new Date().toISOString()),
      body: String(parsed.message ?? parsed.msg ?? line),
      severity: String(parsed.level ?? parsed.severity ?? 'info'),
      source,
      attributes: parsed,
    };
  } catch {
    return parseSyslogLine(line);
  }
}

export function normalizePayload(
  sourceType: TelemetrySourceType,
  payload: string | Record<string, unknown>,
): NormalizedLogRecord[] {
  if (typeof payload === 'object') {
    const records = Array.isArray(payload.records) ? payload.records : [payload];
    return records.map((r) => ({
      timestamp: String((r as Record<string, unknown>).timestamp ?? new Date().toISOString()),
      body: String((r as Record<string, unknown>).message ?? JSON.stringify(r)),
      severity: String((r as Record<string, unknown>).level ?? 'info'),
      source: sourceType,
      attributes: r as Record<string, unknown>,
    }));
  }

  const lines = payload.split('\n').filter(Boolean);
  switch (sourceType) {
    case 'nginx':
    case 'apache':
    case 'tomcat':
    case 'weblogic':
    case 'jboss':
      return lines.map((line) => parseJsonLogLine(line, sourceType));
    case 'syslog':
    case 'linux-journald':
    case 'windows-event-log':
      return lines.map(parseSyslogLine);
    default:
      return lines.map((line) => parseJsonLogLine(line, sourceType));
  }
}

export async function ingestFromSource(
  tenantId: string,
  sourceId: string,
  payload: string | Record<string, unknown>,
): Promise<{ ingested: number }> {
  const source = await queryOne<TelemetrySource>(
    'SELECT * FROM telemetry_sources WHERE id = $1 AND tenant_id = $2 AND enabled = true',
    [sourceId, tenantId],
  );
  if (!source) throw new Error('Telemetry source not found or disabled');

  const records = normalizePayload(source.source_type, payload);
  let ingested = 0;

  for (const record of records) {
    await query(
      `INSERT INTO otlp_logs (tenant_id, timestamp, body, severity, service_name, attributes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        tenantId,
        record.timestamp,
        record.body,
        record.severity,
        record.source,
        JSON.stringify({ ...record.attributes, pipelineSource: source.name, sourceType: source.source_type }),
      ],
    );
    ingested += 1;
  }

  await query('UPDATE telemetry_sources SET last_ingest_at = NOW() WHERE id = $1', [sourceId]);
  return { ingested };
}

export function fingerprintPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
