import { query, queryOne } from '@opsedge360/shared-db';

export interface TopologyEvent {
  id: number;
  tenantId: string;
  eventType: string;
  topologyType: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export async function publishTopologyEvent(
  tenantId: string,
  eventType: string,
  topologyType: string | null,
  payload: Record<string, unknown> = {},
): Promise<TopologyEvent> {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO topology_events (tenant_id, event_type, topology_type, payload)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [tenantId, eventType, topologyType, JSON.stringify(payload)],
  );
  return mapEvent(row!);
}

export async function listTopologyEvents(
  tenantId: string,
  opts: { afterId?: number; limit?: number } = {},
): Promise<TopologyEvent[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const afterId = opts.afterId ?? 0;
  const rows = await query(
    `SELECT * FROM topology_events
     WHERE tenant_id = $1 AND id > $2
     ORDER BY id ASC
     LIMIT $3`,
    [tenantId, afterId, limit],
  );
  return rows.map((r) => mapEvent(r as Record<string, unknown>));
}

function mapEvent(row: Record<string, unknown>): TopologyEvent {
  return {
    id: Number(row.id),
    tenantId: String(row.tenant_id),
    eventType: String(row.event_type),
    topologyType: row.topology_type ? String(row.topology_type) : null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
  };
}

/** In-process SSE subscribers per tenant */
const sseClients = new Map<string, Set<(ev: TopologyEvent) => void>>();

export function subscribeTopologyLive(tenantId: string, handler: (ev: TopologyEvent) => void): () => void {
  if (!sseClients.has(tenantId)) sseClients.set(tenantId, new Set());
  sseClients.get(tenantId)!.add(handler);
  return () => {
    sseClients.get(tenantId)?.delete(handler);
  };
}

export function broadcastTopologyLive(tenantId: string, ev: TopologyEvent): void {
  const set = sseClients.get(tenantId);
  if (!set) return;
  for (const handler of set) {
    try {
      handler(ev);
    } catch {
      /* ignore */
    }
  }
}

export async function publishAndBroadcast(
  tenantId: string,
  eventType: string,
  topologyType: string | null,
  payload: Record<string, unknown> = {},
): Promise<TopologyEvent> {
  const ev = await publishTopologyEvent(tenantId, eventType, topologyType, payload);
  broadcastTopologyLive(tenantId, ev);
  return ev;
}
