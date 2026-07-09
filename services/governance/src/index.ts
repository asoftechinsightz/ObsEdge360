import express from 'express';
import { resolveTenantId, closePool } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';
import * as engine from './governance.engine';

const app = express();
app.use(express.json());

let bus: EventBus | null = null;
function getBus() {
  if (!bus) bus = new EventBus('governance-service');
  return bus;
}

async function tid(req: express.Request) {
  return resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
}

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'governance' }));

app.get('/ha-dr/regions', async (req, res) => {
  try {
    res.json({ regions: await engine.listRegions(await tid(req)) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/ha-dr/status', async (req, res) => {
  try {
    res.json(await engine.getHaDrStatus(await tid(req)));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/ha-dr/failover-test', async (req, res) => {
  try {
    const tenantId = await tid(req);
    const result = await engine.recordFailoverTest(tenantId, req.body.regionCode, req.body.result ?? 'pass');
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(TOPICS.HA_DR_TESTED, createEvent('ha_dr.tested', tenantId, result));
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/fedramp/controls', async (req, res) => {
  try {
    res.json({ controls: await engine.listFedrampControls(await tid(req)) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/fedramp/score', async (req, res) => {
  try {
    res.json(await engine.getFedrampScore(await tid(req)));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/fedramp/assess', async (req, res) => {
  try {
    const tenantId = await tid(req);
    const result = await engine.runFedrampAssessment(tenantId);
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(TOPICS.FEDRAMP_ASSESSED, createEvent('fedramp.assessed', tenantId, result));
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

const port = Number(process.env.GOVERNANCE_PORT ?? 4010);
app.listen(port, () => console.log(`Governance service on :${port}`));

process.on('SIGTERM', async () => {
  await getBus().disconnect();
  await closePool();
  process.exit(0);
});
