import express from 'express';
import { resolveTenantId, closePool } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';
import * as engine from './remediation.engine';

const app = express();
app.use(express.json());

let bus: EventBus | null = null;
function getBus() {
  if (!bus) bus = new EventBus('remediation-service');
  return bus;
}

async function tid(req: express.Request) {
  return resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
}

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'remediation' }));

app.get('/runbooks', async (req, res) => {
  try {
    res.json({ runbooks: await engine.listRunbooks(await tid(req)) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/match', async (req, res) => {
  try {
    res.json({ matches: await engine.matchRunbooks(await tid(req), req.body) });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/request', async (req, res) => {
  try {
    const tenantId = await tid(req);
    const result = await engine.requestRemediation(tenantId, req.body.runbookId, req.body.context ?? {});
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(TOPICS.REMEDIATION_REQUESTED, createEvent('remediation.requested', tenantId, result));
    if (result.status === 'completed') {
      await eventBus.publish(TOPICS.REMEDIATION_EXECUTED, createEvent('remediation.executed', tenantId, result));
    }
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/approvals/:id/execute', async (req, res) => {
  try {
    const tenantId = await tid(req);
    const result = await engine.approveAndExecute(tenantId, req.params.id, req.body.resolvedBy);
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(TOPICS.REMEDIATION_EXECUTED, createEvent('remediation.executed', tenantId, result));
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/executions', async (req, res) => {
  try {
    res.json({ executions: await engine.listExecutions(await tid(req)) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/ot/zones', async (req, res) => {
  try {
    res.json({ zones: await engine.listOtSafetyZones(await tid(req)) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

const port = Number(process.env.REMEDIATION_PORT ?? 4007);
app.listen(port, () => console.log(`Remediation service on :${port}`));

process.on('SIGTERM', async () => {
  await getBus().disconnect();
  await closePool();
  process.exit(0);
});
