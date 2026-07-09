import { query, queryOne } from '@opsedge360/shared-db';
import { generateAgentKey, hashAgentKey, verifyAgentKey } from './agent.util';

export interface AgentRow {
  id: string;
  tenant_id: string;
  name: string;
  agent_key_hash: string;
  hostname: string | null;
  version: string | null;
  status: string;
  capabilities: string[];
  metadata: Record<string, unknown>;
  last_heartbeat_at: string | null;
  registered_at: string;
}

export async function listAgents(tenantId: string): Promise<AgentRow[]> {
  return query<AgentRow>(
    'SELECT * FROM discovery_agents WHERE tenant_id = $1 ORDER BY name',
    [tenantId],
  );
}

export async function registerAgent(
  tenantId: string,
  data: { name: string; hostname?: string; capabilities?: string[] },
): Promise<{ agent: Omit<AgentRow, 'agent_key_hash'>; agentKey: string }> {
  const agentKey = generateAgentKey();
  const row = await queryOne<AgentRow>(
    `INSERT INTO discovery_agents (tenant_id, name, agent_key_hash, hostname, capabilities, status, last_heartbeat_at)
     VALUES ($1, $2, $3, $4, $5, 'online', NOW())
     RETURNING *`,
    [
      tenantId,
      data.name,
      hashAgentKey(agentKey),
      data.hostname ?? null,
      data.capabilities ?? ['host-metrics', 'heartbeat'],
    ],
  );
  if (!row) throw new Error('Failed to register agent');
  const { agent_key_hash: _, ...agent } = row;
  return { agent, agentKey };
}

export interface AgentMetricsPayload {
  cpuPct?: number;
  memoryPct?: number;
  diskPct?: number;
  load1m?: number;
  networkInMbps?: number;
  networkOutMbps?: number;
  status?: string;
  labels?: Record<string, unknown>;
}

export async function heartbeatAgent(
  agentId: string,
  agentKey: string,
  data: {
    hostname?: string;
    version?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    metrics?: AgentMetricsPayload;
  },
): Promise<{ agent: AgentRow; metricsIngested: boolean } | null> {
  const row = await queryOne<AgentRow>('SELECT * FROM discovery_agents WHERE id = $1', [agentId]);
  if (!row || !verifyAgentKey(agentKey, row.agent_key_hash)) return null;

  const hostname = data.hostname ?? row.hostname ?? row.name;
  const metadata = {
    ...(row.metadata ?? {}),
    ...(data.metadata ?? {}),
    ...(data.metrics
      ? {
          lastMetrics: {
            cpuPct: data.metrics.cpuPct,
            memoryPct: data.metrics.memoryPct,
            diskPct: data.metrics.diskPct,
            at: new Date().toISOString(),
          },
        }
      : {}),
  };

  const updated = await queryOne<AgentRow>(
    `UPDATE discovery_agents
     SET last_heartbeat_at = NOW(),
         status = $2,
         hostname = COALESCE($3, hostname),
         version = COALESCE($4, version),
         metadata = $5
     WHERE id = $1
     RETURNING *`,
    [
      agentId,
      data.status ?? data.metrics?.status ?? 'online',
      hostname,
      data.version ?? null,
      JSON.stringify(metadata),
    ],
  );
  if (!updated) return null;

  let metricsIngested = false;
  if (data.metrics) {
    try {
      await query(
        `INSERT INTO host_metrics
          (tenant_id, hostname, cpu_pct, memory_pct, disk_pct, load_1m, network_in_mbps, network_out_mbps, status, labels)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          updated.tenant_id,
          hostname,
          data.metrics.cpuPct ?? 0,
          data.metrics.memoryPct ?? 0,
          data.metrics.diskPct ?? 0,
          data.metrics.load1m ?? 0,
          data.metrics.networkInMbps ?? 0,
          data.metrics.networkOutMbps ?? 0,
          data.metrics.status ?? 'up',
          JSON.stringify({
            agentId: updated.id,
            agentName: updated.name,
            source: 'host-agent',
            ...(data.metrics.labels ?? {}),
          }),
        ],
      );
      metricsIngested = true;
    } catch (err) {
      console.warn('[agents] host_metrics insert failed:', (err as Error).message);
    }
  }

  return { agent: updated, metricsIngested };
}

export async function markStaleAgentsOffline(): Promise<void> {
  await query(
    `UPDATE discovery_agents
     SET status = 'offline'
     WHERE status = 'online'
       AND last_heartbeat_at < NOW() - INTERVAL '5 minutes'`,
  );
}

export function serializeAgent(row: AgentRow) {
  const { agent_key_hash: _, ...agent } = row;
  return {
    ...agent,
    isOnline: row.status === 'online' && row.last_heartbeat_at
      ? Date.now() - new Date(row.last_heartbeat_at).getTime() < 5 * 60 * 1000
      : false,
  };
}
