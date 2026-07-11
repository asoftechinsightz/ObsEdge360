import express from 'express';
import https from 'https';
import { resolveTenantId } from '@opsedge360/shared-db';
import {
  serviceAuthRequired,
  verifyServiceJwt,
  mtlsEnabled,
  mtlsRequired,
  loadMtlsFiles,
  verifySpiffePeerPem,
} from '@opsedge360/shared-security';
import * as repo from './cmdb.repository';
import { startKafkaConsumer, getEventBus, ingestDiscoveredAsset } from './kafka-consumer';
import { getImpactFromGraph } from './graph-sync';
import { closeGraph } from './graph-sync';
import { closePool, mountOpsEndpoints } from '@opsedge360/shared-db';
import * as topology from './topology.service';

const app = express();
app.use(express.json());

mountOpsEndpoints(app, {
  service: 'cmdb',
  version: '1.0.0',
  includeHealth: false,
  readyCheck: async () => {
    try {
      await resolveTenantId();
      return true;
    } catch {
      return false;
    }
  },
});

function peerAuthorized(req: express.Request): { ok: boolean; spiffeId?: string } {
  const socket = req.socket as import('tls').TLSSocket;
  if (!socket || typeof socket.getPeerCertificate !== 'function') {
    return { ok: false };
  }
  if (!socket.authorized && mtlsRequired()) {
    return { ok: false };
  }
  const peer = socket.getPeerCertificate(true);
  if (!peer || !peer.raw) return { ok: false };
  const files = loadMtlsFiles(process.env.MESH_CMDB_IDENTITY_NAME ?? 'cmdb');
  if (!files.ca) return { ok: false };
  const peerPem = `-----BEGIN CERTIFICATE-----\n${Buffer.from(peer.raw).toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----\n`;
  const verified = verifySpiffePeerPem(peerPem, files.ca.toString('utf8'));
  return { ok: verified.ok, spiffeId: verified.spiffeId };
}

/** Wave 5+7: mTLS peer OR gateway service JWT when SERVICE_AUTH_REQUIRED=true */
app.use((req, res, next) => {
  const path = req.path || '';
  if (['/health', '/ready', '/live', '/metrics', '/version'].includes(path)) {
    next();
    return;
  }
  if (!serviceAuthRequired() && !mtlsRequired()) {
    next();
    return;
  }

  if (mtlsEnabled()) {
    const peer = peerAuthorized(req);
    if (peer.ok) {
      (req as express.Request & { serviceIdentity?: unknown }).serviceIdentity = {
        kind: 'mtls',
        spiffeId: peer.spiffeId,
      };
      next();
      return;
    }
    if (mtlsRequired() && (req.socket as import('tls').TLSSocket)?.encrypted) {
      res.status(401).json({ error: 'mTLS client certificate required', code: 'MTLS_REQUIRED' });
      return;
    }
  }

  if (!serviceAuthRequired()) {
    next();
    return;
  }
  const header =
    (req.headers['x-service-authorization'] as string | undefined) ||
    (req.headers.authorization as string | undefined);
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Service authentication required', code: 'SERVICE_AUTH_REQUIRED' });
    return;
  }
  try {
    const claims = verifyServiceJwt(header.slice(7));
    (req as express.Request & { serviceIdentity?: unknown }).serviceIdentity = claims;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid service token', code: 'SERVICE_AUTH_INVALID' });
  }
});

function paramId(req: express.Request, name = 'id'): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

async function tenantMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const slug = (req.headers['x-tenant-id'] as string) ?? (req.query.tenantId as string);
    (req as express.Request & { tenantId: string }).tenantId = await resolveTenantId(slug);
    next();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

app.get('/health', async (_, res) => {
  try {
    const tenantId = await resolveTenantId();
    const stats = await repo.getStats(tenantId);
    res.json({ status: 'healthy', service: 'cmdb', ...stats });
  } catch {
    res.status(503).json({ status: 'unhealthy', service: 'cmdb' });
  }
});

app.get('/cis', tenantMiddleware, async (req, res) => {
  const tenantId = (req as express.Request & { tenantId: string }).tenantId;
  const items = await repo.listCis(tenantId, {
    ciType: req.query.ciType as string,
    search: req.query.search as string,
  });
  res.json({ total: items.length, items });
});

app.get('/cis/:id', tenantMiddleware, async (req, res) => {
  const tenantId = (req as express.Request & { tenantId: string }).tenantId;
  const ci = await repo.getCiById(tenantId, paramId(req));
  if (!ci) return res.status(404).json({ error: 'Not found' });
  res.json(ci);
});

app.get('/cis/:id/relationships', tenantMiddleware, async (req, res) => {
  const tenantId = (req as express.Request & { tenantId: string }).tenantId;
  const relationships = await repo.getRelationships(tenantId, paramId(req));
  res.json({ relationships });
});

app.post('/cis', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const ci = await repo.upsertCi(tenantId, req.body);
    res.status(201).json(ci);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.patch('/cis/:id', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const ci = await repo.updateCi(tenantId, paramId(req), req.body);
    res.json(ci);
  } catch (err) {
    const msg = (err as Error).message;
    res.status(msg === 'CI not found' ? 404 : 400).json({ error: msg });
  }
});

app.delete('/cis/:id', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const ok = await repo.deleteCi(tenantId, paramId(req));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/relationships', tenantMiddleware, async (req, res) => {
  const tenantId = (req as express.Request & { tenantId: string }).tenantId;
  const relationships = await repo.listRelationships(tenantId);
  res.json({ relationships });
});

app.post('/relationships', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const { sourceCiId, targetCiId, relationshipType, strength } = req.body;
    const rel = await repo.upsertRelationship(tenantId, sourceCiId, targetCiId, relationshipType, {
      strength,
    });
    res.status(201).json(rel);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/relationships/:id', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const ok = await repo.deleteRelationship(tenantId, paramId(req));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/import', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const items = Array.isArray(req.body) ? req.body : req.body?.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Body must be an array or { items: [] }' });
    }
    const result = await repo.importCis(tenantId, items);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/export', tenantMiddleware, async (req, res) => {
  const tenantId = (req as express.Request & { tenantId: string }).tenantId;
  const format = (req.query.format as string) ?? 'json';
  const items = await repo.listCis(tenantId, { limit: 5000 });
  const relationships = await repo.listRelationships(tenantId);

  if (format === 'csv') {
    const header = 'id,name,ciType,status,healthScore,complianceScore,riskScore,aiConfidenceScore,externalId,tags';
    const rows = items.map((ci) =>
      [
        ci.id,
        csvEscape(ci.name),
        ci.ciType,
        ci.status,
        ci.healthScore,
        ci.complianceScore,
        ci.riskScore,
        ci.aiConfidenceScore,
        ci.externalId ?? '',
        csvEscape((ci.tags ?? []).join('|')),
      ].join(','),
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="cmdb-export.csv"');
    return res.send([header, ...rows].join('\n'));
  }

  res.json({ exportedAt: new Date().toISOString(), total: items.length, items, relationships });
});

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

app.get('/twin/graph', tenantMiddleware, async (req, res) => {
  const tenantId = (req as express.Request & { tenantId: string }).tenantId;
  const limit = Math.min(Number(req.query.limit ?? 1000) || 1000, 2000);
  const ciType = req.query.ciType as string | undefined;
  const graph = await repo.getTwinGraph(tenantId);
  let nodes = graph.nodes;
  if (ciType) nodes = nodes.filter((n) => n.ciType === ciType);
  nodes = nodes.slice(0, limit);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = graph.edges.filter((e) => nodeIds.has(e.sourceCiId) && nodeIds.has(e.targetCiId));

  res.json({
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.name,
      type: n.ciType,
      status: n.status,
      healthScore: n.healthScore,
      riskScore: n.riskScore,
    })),
    edges: edges.map((e) => ({
      source: e.sourceCiId,
      target: e.targetCiId,
      type: e.relationshipType,
      strength: e.strength,
    })),
    meta: { totalNodes: graph.nodes.length, returnedNodes: nodes.length, returnedEdges: edges.length },
  });
});

app.get('/twin/impact/:ciId', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const ciId = paramId(req, 'ciId');
    const depth = Number(req.query.depth ?? 3);
    const direction = (req.query.direction as 'downstream' | 'upstream' | 'both') ?? 'downstream';

    // Prefer PostgreSQL adjacency (always available); enrich with Neo4j if present
    const blast = await repo.analyzeBlastRadius(tenantId, ciId, { depth, direction });
    if (!blast) return res.status(404).json({ error: 'CI not found' });

    const neo = await getImpactFromGraph(tenantId, ciId);
    if (neo.ciIds.length > blast.affectedCis) {
      blast.source = 'neo4j';
    }

    res.json(blast);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/twin/blast-radius/:ciId', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const ciId = paramId(req, 'ciId');
    const depth = Number(req.query.depth ?? 3);
    const direction = (req.query.direction as 'downstream' | 'upstream' | 'both') ?? 'downstream';
    const useCache = req.query.cache !== 'false';
    if (useCache) {
      const cached = await repo.getCachedBlastRadius(tenantId, ciId, { depth, direction });
      if (cached) return res.json(cached);
    }
    const blast = await repo.analyzeBlastRadius(tenantId, ciId, { depth, direction });
    if (!blast) return res.status(404).json({ error: 'CI not found' });
    res.json(blast);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/stats', tenantMiddleware, async (req, res) => {
  const tenantId = (req as express.Request & { tenantId: string }).tenantId;
  res.json(await repo.getStats(tenantId));
});

/** Wave 3 aliases / depth APIs */
app.get('/assets', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const items = await repo.listCis(tenantId, {
      ciType: req.query.ciType as string | undefined,
      search: req.query.q as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : 100,
    });
    res.json({ assets: items, items });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/drift', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const engine = await import('./relationship-engine');
    res.json({
      events: await engine.listDrift(tenantId, {
        openOnly: req.query.open !== 'false',
        limit: req.query.limit ? Number(req.query.limit) : 50,
      }),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/history', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const ciId = req.query.ciId as string;
    if (!ciId) return res.status(400).json({ error: 'ciId required' });
    const engine = await import('./relationship-engine');
    res.json({ history: await engine.listHistory(tenantId, ciId) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Wave 4 static topology routes MUST precede /topology/:type */
app.post('/topology/sync-traces', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const hours = Number(req.body?.hours ?? req.query.hours ?? 1);
    const traceDep = await import('./trace-dependency.service');
    const result = await traceDep.syncTraceDependencies(tenantId, hours);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/topology/dependencies', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const traceDep = await import('./trace-dependency.service');
    const deps = await traceDep.listInferredDependencies(tenantId, {
      origin: req.query.origin as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : 200,
    });
    res.json({ dependencies: deps, count: deps.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/topology/layers', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    res.json({ layers: await topology.listLayerStats(tenantId) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/topology/events', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const events = await import('./topology-events');
    const list = await events.listTopologyEvents(tenantId, {
      afterId: req.query.afterId ? Number(req.query.afterId) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    });
    res.json({ events: list, latestId: list.length ? list[list.length - 1].id : Number(req.query.afterId ?? 0) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/topology/live', tenantMiddleware, async (req, res) => {
  const tenantId = (req as express.Request & { tenantId: string }).tenantId;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: connected\ndata: ${JSON.stringify({ tenantId, at: new Date().toISOString() })}\n\n`);

  const events = await import('./topology-events');
  const unsub = events.subscribeTopologyLive(tenantId, (ev) => {
    res.write(`event: topology\ndata: ${JSON.stringify(ev)}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsub();
  });
});

app.get('/topology/:type', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const type = paramId(req, 'type') as topology.TopologyType;
    const latest = await topology.getLatestTopology(tenantId, type);
    if (!latest) {
      const refreshed = await topology.incrementalRefresh(tenantId, type);
      return res.json(refreshed);
    }
    res.json(latest);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/topology/:type/refresh', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const type = paramId(req, 'type') as topology.TopologyType;
    const snapshot = await topology.incrementalRefresh(tenantId, type);
    res.status(201).json(snapshot);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/topology/:type/layout', tenantMiddleware, async (req, res) => {
  try {
    const tenantId = (req as express.Request & { tenantId: string }).tenantId;
    const type = paramId(req, 'type') as topology.TopologyType;
    const algorithm = (req.body?.algorithm as 'force-directed' | 'layered' | 'circular' | 'grid') ?? 'force-directed';
    const snapshot = await topology.applyAndPersistLayout(tenantId, type, algorithm);
    res.status(201).json(snapshot);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** Internal endpoint for discovery service when Kafka is unavailable */
app.post('/internal/ingest', tenantMiddleware, async (req, res) => {
  const tenantId = (req as express.Request & { tenantId: string }).tenantId;
  const { asset, sourceConnector } = req.body;
  await ingestDiscoveredAsset(tenantId, asset, sourceConnector ?? 'unknown');
  res.status(201).json({ status: 'ingested' });
});

const port = Number(process.env.CMDB_PORT ?? 4002);
const mtlsPort = Number(process.env.CMDB_MTLS_PORT ?? 4443);

async function bootstrap() {
  try {
    await startKafkaConsumer();
  } catch (err) {
    console.warn('[cmdb] Kafka consumer failed to start:', (err as Error).message);
  }

  app.listen(port, () => console.log(`CMDB service on :${port}`));

  if (mtlsEnabled()) {
    const files = loadMtlsFiles(process.env.MESH_CMDB_IDENTITY_NAME ?? 'cmdb');
    if (files.cert && files.key && files.ca) {
      https
        .createServer(
          {
            key: files.key,
            cert: files.cert,
            ca: files.ca,
            requestCert: true,
            rejectUnauthorized: false,
          },
          app,
        )
        .listen(mtlsPort, () => console.log(`CMDB mTLS on :${mtlsPort}`));
    } else {
      console.warn('[cmdb] MTLS_ENABLED but SVID files missing — HTTPS listener skipped');
    }
  }
}

bootstrap();

process.on('SIGTERM', async () => {
  await getEventBus().disconnect();
  await closeGraph();
  await closePool();
  process.exit(0);
});
