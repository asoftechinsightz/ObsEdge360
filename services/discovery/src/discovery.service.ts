import { query, queryOne, resolveTenantId } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';
import type { DiscoveredAsset } from '@opsedge360/shared-types';
import { getConnector } from './connectors/registry';
import type { ConnectorConfig } from './connectors/types';
import { startScheduleRunner, stopScheduleRunner } from './schedule.service';
import { markStaleAgentsOffline } from './agent.service';

interface ConnectorRow {
  id: string;
  tenant_id: string;
  name: string;
  protocol: string;
  config: ConnectorConfig;
  enabled: boolean;
  last_run_at: string | null;
}

let bus: EventBus | null = null;

function getBus(): EventBus {
  if (!bus) bus = new EventBus('discovery-service');
  return bus;
}

export async function listConnectors(tenantId: string) {
  return query<ConnectorRow>(
    'SELECT * FROM discovery_connectors WHERE tenant_id = $1 ORDER BY name',
    [tenantId],
  );
}

export async function createConnector(
  tenantId: string,
  data: { name: string; protocol: string; config?: ConnectorConfig; enabled?: boolean },
) {
  return queryOne<ConnectorRow>(
    `INSERT INTO discovery_connectors (tenant_id, name, protocol, config, enabled)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [tenantId, data.name, data.protocol, JSON.stringify(data.config ?? {}), data.enabled ?? true],
  );
}

export async function updateConnector(
  tenantId: string,
  connectorId: string,
  data: { name?: string; config?: ConnectorConfig; enabled?: boolean },
) {
  const row = await queryOne<ConnectorRow>(
    `UPDATE discovery_connectors
     SET name = COALESCE($3, name),
         config = COALESCE($4, config),
         enabled = COALESCE($5, enabled)
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      tenantId,
      connectorId,
      data.name ?? null,
      data.config ? JSON.stringify(data.config) : null,
      data.enabled ?? null,
    ],
  );
  if (!row) throw new Error('Connector not found');
  return row;
}

export async function deleteConnector(tenantId: string, connectorId: string): Promise<boolean> {
  const rows = await query(
    'DELETE FROM discovery_connectors WHERE tenant_id = $1 AND id = $2 RETURNING id',
    [tenantId, connectorId],
  );
  return rows.length > 0;
}

export async function runScan(tenantId: string, connectorId: string) {
  const connectorRow = await queryOne<ConnectorRow>(
    'SELECT * FROM discovery_connectors WHERE tenant_id = $1 AND id = $2 AND enabled = true',
    [tenantId, connectorId],
  );

  if (!connectorRow) {
    throw new Error('Connector not found or disabled');
  }

  const connector = getConnector(connectorRow.protocol);
  if (!connector) {
    throw new Error(`Unsupported protocol: ${connectorRow.protocol}`);
  }

  const scanId = `scan-${Date.now()}`;
  const assets: DiscoveredAsset[] = [];

  for await (const asset of connector.discover(connectorRow.config)) {
    assets.push(asset);
    await publishAsset(tenantId, asset, connectorRow.protocol);
  }

  await query(
    'UPDATE discovery_connectors SET last_run_at = NOW() WHERE id = $1',
    [connectorId],
  );

  return { scanId, status: 'completed', assetsDiscovered: assets.length, assets };
}

export async function runAllEnabledScans(tenantId: string) {
  const connectors = await listConnectors(tenantId);
  const results = [];
  for (const c of connectors.filter((x) => x.enabled)) {
    try {
      const result = await runScan(tenantId, c.id);
      results.push({ connectorId: c.id, name: c.name, ...result });
    } catch (err) {
      results.push({ connectorId: c.id, name: c.name, status: 'failed', error: (err as Error).message });
    }
  }
  return results;
}

async function publishAsset(tenantId: string, asset: DiscoveredAsset, sourceConnector: string): Promise<void> {
  const cmdbUrl = process.env.CMDB_URL ?? 'http://localhost:4002';

  // Phase 1 default: direct HTTP ingest (KAFKA_ENABLED=false)
  if (process.env.KAFKA_ENABLED === 'false') {
    await fetch(`${cmdbUrl}/internal/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId },
      body: JSON.stringify({ asset, sourceConnector }),
    }).catch((err) => console.warn('[discovery] CMDB ingest failed:', err.message));
    return;
  }

  const eventBus = getBus();
  await eventBus.connect();
  await eventBus.publish(
    TOPICS.ASSET_DISCOVERED,
    createEvent('asset.discovered', tenantId, {
      externalId: asset.externalId,
      name: asset.name,
      ciType: asset.ciType,
      attributes: asset.attributes,
      aiConfidenceScore: asset.aiConfidenceScore,
      relationships: asset.relationships,
      sourceConnector,
    }),
  );
}

export async function ensureDefaultConnectors(tenantId: string): Promise<void> {
  const existing = await queryOne('SELECT id FROM discovery_connectors WHERE tenant_id = $1 LIMIT 1', [tenantId]);
  if (existing) return;

  await createConnector(tenantId, { name: 'Demo IT Infrastructure', protocol: 'static', config: { prefix: 'demo' } });
  await createConnector(tenantId, {
    name: 'K8s Prod Cluster',
    protocol: 'kubernetes',
    config: { clusterName: 'k8s-prod', namespace: 'production' },
  });
  await createConnector(tenantId, {
    name: 'AWS Production',
    protocol: 'aws',
    config: { region: 'ap-south-1', accountId: '123456789012' },
  });
  await createConnector(tenantId, {
    name: 'Network Core SNMP',
    protocol: 'snmp',
    config: { version: 'v2c', community: 'public' },
  });
  await createConnector(tenantId, {
    name: 'OT Plant Floor OPC-UA',
    protocol: 'opc-ua',
    config: { safetyZone: 'production', readOnly: true, maxPollRateHz: 0.5 },
  });
  await createConnector(tenantId, {
    name: 'Modbus Device Scan',
    protocol: 'modbus',
    config: { safetyZone: 'production', readOnly: true },
  });
  await createConnector(tenantId, {
    name: 'IoT MQTT Broker',
    protocol: 'mqtt',
    config: { broker: 'mqtt://10.0.60.10:1883' },
  });
}

export async function initDiscovery(): Promise<void> {
  const tenantId = await resolveTenantId();
  await ensureDefaultConnectors(tenantId);
  await getBus().connect();
  startScheduleRunner();
  setInterval(() => {
    markStaleAgentsOffline().catch(() => undefined);
  }, 60_000);
}

export { getBus, stopScheduleRunner };
