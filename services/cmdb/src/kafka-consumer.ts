import { EventBus, TOPICS, createEvent, type PlatformEvent } from '@opsedge360/event-bus';
import type { DiscoveredAsset, RelationshipType } from '@opsedge360/shared-types';
import * as repo from './cmdb.repository';
import { syncCiToGraph, syncRelationshipToGraph } from './graph-sync';

let bus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!bus) bus = new EventBus('cmdb-service');
  return bus;
}

interface AssetPayload {
  externalId?: string;
  name: string;
  ciType: string;
  attributes?: Record<string, unknown>;
  aiConfidenceScore?: number;
  tags?: string[];
  relationships?: Array<{ targetExternalId: string; type: string }>;
  sourceConnector?: string;
}

export async function startKafkaConsumer(): Promise<void> {
  const eventBus = getEventBus();
  await eventBus.connect();

  await eventBus.subscribe('cmdb-service', [TOPICS.ASSET_DISCOVERED, TOPICS.ASSET_UPDATED], async (topic, event) => {
    await handleAssetEvent(topic, event as PlatformEvent<AssetPayload>);
  });
}

async function handleAssetEvent(topic: string, event: PlatformEvent<AssetPayload>): Promise<void> {
  const p = event.payload;
  console.log(`[cmdb] Processing ${topic}: ${p.name}`);

  const ci = await repo.upsertCi(event.tenantId, {
    externalId: p.externalId,
    name: p.name,
    ciType: p.ciType as repo.UpsertCiInput['ciType'],
    aiConfidenceScore: p.aiConfidenceScore,
    attributes: { ...p.attributes, discoveredBy: p.sourceConnector },
    tags: p.tags,
    status: 'active',
  });

  await syncCiToGraph(ci);

  if (p.relationships?.length) {
    for (const rel of p.relationships) {
      const target = rel.targetExternalId
        ? await repo.getCiByExternalId(event.tenantId, rel.targetExternalId)
        : null;
      if (target) {
        const relationship = await repo.upsertRelationship(
          event.tenantId,
          ci.id,
          target.id,
          rel.type as RelationshipType,
        );
        await syncRelationshipToGraph(relationship);
      }
    }
  }

  const cmdbBus = getEventBus();
  await cmdbBus.publish(TOPICS.CMDB_UPDATED, createEvent('cmdb.updated', event.tenantId, {
    ciId: ci.id,
    changeType: topic === TOPICS.ASSET_DISCOVERED ? 'created' : 'updated',
  }));

  await cmdbBus.publish(TOPICS.TWIN_UPDATED, createEvent('twin.updated', event.tenantId, { ciId: ci.id }));

  // Trigger discovery AI agent (Phase 2)
  triggerAgent('asset.discovered', event.tenantId, { name: p.name, ciType: p.ciType, aiConfidenceScore: p.aiConfidenceScore }).catch(() => undefined);
}

async function triggerAgent(eventType: string, tenantId: string, payload: unknown): Promise<void> {
  const agentsUrl = process.env.AI_AGENTS_URL ?? 'http://localhost:5000';
  await fetch(`${agentsUrl}/api/v1/agents/trigger/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, tenantId, payload }),
  });
}

export async function ingestDiscoveredAsset(tenantId: string, asset: DiscoveredAsset, sourceConnector: string): Promise<void> {
  const event = createEvent('asset.discovered', tenantId, {
    externalId: asset.externalId,
    name: asset.name,
    ciType: asset.ciType,
    attributes: asset.attributes,
    aiConfidenceScore: asset.aiConfidenceScore,
    relationships: asset.relationships,
    tags: asset.tags,
    sourceConnector,
  });

  if (process.env.KAFKA_ENABLED !== 'false') {
    const eventBus = getEventBus();
    await eventBus.connect();
    await eventBus.publish(TOPICS.ASSET_DISCOVERED, event);
    return;
  }

  await handleAssetEvent(TOPICS.ASSET_DISCOVERED, event as PlatformEvent<AssetPayload>);
}
