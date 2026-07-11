import express from 'express';
import { closePool, mountOpsEndpoints, query } from '@opsedge360/shared-db';
import { SUPPORTED_PROTOCOLS } from './connectors/types';
import * as discovery from './discovery.service';
import * as agents from './agent.service';
import * as agentConfig from './agent-config.service';
import * as schedules from './schedule.service';

const app = express();
app.use(express.json());

mountOpsEndpoints(app, {
  service: 'discovery',
  version: '1.0.0',
  readyCheck: async () => {
    try {
      await query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  },
});

function mapConnector(c: {
  id: string;
  name: string;
  protocol: string;
  enabled: boolean;
  last_run_at: string | null;
  config: unknown;
}) {
  return {
    id: c.id,
    name: c.name,
    protocol: c.protocol,
    enabled: c.enabled,
    lastRunAt: c.last_run_at,
    config: c.config,
  };
}

async function tenantIdFrom(req: express.Request): Promise<string> {
  const { resolveTenantId } = await import('@opsedge360/shared-db');
  return resolveTenantId(req.headers['x-tenant-id'] as string);
}

app.get('/protocols', (_, res) => res.json({ protocols: SUPPORTED_PROTOCOLS }));

app.get('/connectors', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const connectors = await discovery.listConnectors(tenantId);
    res.json({ connectors: connectors.map(mapConnector) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/connectors', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const row = await discovery.createConnector(tenantId, req.body);
    if (!row) return res.status(400).json({ error: 'Failed to create connector' });
    res.status(201).json(mapConnector(row));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.patch('/connectors/:id', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const row = await discovery.updateConnector(tenantId, req.params.id, req.body);
    res.json(mapConnector(row));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/connectors/:id', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const ok = await discovery.deleteConnector(tenantId, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Connector not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/scan', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);

    if (req.body.connectorId) {
      const result = await discovery.runScan(tenantId, req.body.connectorId);
      await schedules.createNotification(tenantId, {
        type: 'scan_complete',
        title: 'Discovery scan completed',
        message: `Discovered ${result.assetsDiscovered} assets`,
        metadata: { connectorId: req.body.connectorId, scanId: result.scanId },
      });
      return res.json(result);
    }

    const results = await discovery.runAllEnabledScans(tenantId);
    res.json({ status: 'completed', results });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/agents', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const list = await agents.listAgents(tenantId);
    res.json({ agents: list.map(agents.serializeAgent) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/agents/register', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const result = await agents.registerAgent(tenantId, req.body);
    res.status(201).json(result);
  } catch (err) {
    const msg = (err as Error).message || String(err);
    const dbDown = /ECONNREFUSED|connect|timeout|does not exist|password authentication/i.test(msg);
    res.status(dbDown ? 503 : 400).json({
      error: dbDown
        ? 'Database unavailable. Start Postgres and run: npm run db:migrate'
        : msg || 'Agent registration failed',
    });
  }
});

app.post('/agents/:id/heartbeat', async (req, res) => {
  try {
    const agentKey = req.headers['x-agent-key'] as string;
    if (!agentKey) return res.status(401).json({ error: 'Missing X-Agent-Key header' });
    const agentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await agents.heartbeatAgent(agentId, agentKey, req.body);
    if (!result) return res.status(401).json({ error: 'Invalid agent or key' });
    res.json({
      agent: agents.serializeAgent(result.agent),
      metricsIngested: result.metricsIngested,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/agents/:id/metrics', async (req, res) => {
  try {
    const agentKey = req.headers['x-agent-key'] as string;
    if (!agentKey) return res.status(401).json({ error: 'Missing X-Agent-Key header' });
    const agentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = req.body ?? {};
    const result = await agents.heartbeatAgent(agentId, agentKey, {
      hostname: body.hostname,
      version: body.version,
      status: body.status ?? 'online',
      metadata: body.metadata,
      metrics: body.metrics ?? body,
    });
    if (!result) return res.status(401).json({ error: 'Invalid agent or key' });
    res.status(201).json({
      agent: agents.serializeAgent(result.agent),
      metricsIngested: result.metricsIngested,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/agents/:id/config', async (req, res) => {
  try {
    const agentKey = req.headers['x-agent-key'] as string;
    if (!agentKey) return res.status(401).json({ error: 'Missing X-Agent-Key header' });
    const agentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const config = await agentConfig.getAgentConfig(agentId, agentKey);
    if (!config) return res.status(401).json({ error: 'Invalid agent or key' });
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.put('/agents/:id/config', async (req, res) => {
  try {
    const agentKey = req.headers['x-agent-key'] as string;
    if (!agentKey) return res.status(401).json({ error: 'Missing X-Agent-Key header' });
    const agentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const config = await agentConfig.setAgentConfig(agentId, agentKey, req.body);
    if (!config) return res.status(401).json({ error: 'Invalid agent or key' });
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/agents/:id/updates', async (req, res) => {
  try {
    const agentKey = req.headers['x-agent-key'] as string;
    if (!agentKey) return res.status(401).json({ error: 'Missing X-Agent-Key header' });
    const agentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const version = (req.query.version as string) ?? '0.0.0';
    const manifest = await agentConfig.getAgentUpdateManifest(agentId, agentKey, version);
    res.json(manifest);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/schedules', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const list = await schedules.listSchedules(tenantId);
    res.json({ schedules: list });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/schedules', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const row = await schedules.createSchedule(tenantId, req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/schedules/:id', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const ok = await schedules.deleteSchedule(tenantId, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/notifications', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const list = await schedules.listNotifications(tenantId);
    res.json({ notifications: list });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/notifications/:id/read', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    await schedules.markNotificationRead(tenantId, req.params.id);
    res.json({ read: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** Phase 3 Wave 3 — Discovery jobs / runs / results / providers / targets */
app.get('/providers', async (_req, res) => {
  try {
    const jobs = await import('./discovery-jobs.service');
    res.json(await jobs.listProviders());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/jobs', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const jobs = await import('./discovery-jobs.service');
    res.json({ jobs: await jobs.listJobs(tenantId) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/jobs', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const jobs = await import('./discovery-jobs.service');
    const row = await jobs.createJob(tenantId, req.body ?? {});
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/jobs/:id/run', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const jobs = await import('./discovery-jobs.service');
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await jobs.runJob(tenantId, jobId, discovery.publishAssetForJobs);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/run', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const connectorId = req.body?.connectorId as string | undefined;
    if (!connectorId) return res.status(400).json({ error: 'connectorId required' });
    const result = await discovery.runScan(tenantId, connectorId);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/runs', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const jobs = await import('./discovery-jobs.service');
    res.json({
      runs: await jobs.listRuns(tenantId, {
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        jobId: req.query.jobId as string | undefined,
      }),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/results', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const runId = req.query.runId as string;
    if (!runId) return res.status(400).json({ error: 'runId required' });
    const jobs = await import('./discovery-jobs.service');
    res.json({ results: await jobs.listResults(tenantId, runId) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/targets', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const jobs = await import('./discovery-jobs.service');
    res.json({ targets: await jobs.listTargets(tenantId) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/targets', async (req, res) => {
  try {
    const tenantId = await tenantIdFrom(req);
    const jobs = await import('./discovery-jobs.service');
    const row = await jobs.createTarget(tenantId, req.body ?? {});
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const port = Number(process.env.DISCOVERY_PORT ?? 4001);

discovery.initDiscovery().then(() => {
  app.listen(port, () => console.log(`Discovery service on :${port}`));
}).catch((err) => {
  console.error('[discovery] init failed:', err.message);
  app.listen(port, () => console.log(`Discovery service on :${port} (degraded)`));
});

process.on('SIGTERM', async () => {
  discovery.stopScheduleRunner();
  await discovery.getBus().disconnect();
  await closePool();
  process.exit(0);
});
