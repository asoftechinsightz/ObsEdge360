import express from 'express';
import { resolveTenantId, closePool } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';
import * as engine from './security.engine';

const app = express();
app.use(express.json());

let bus: EventBus | null = null;
function getBus() {
  if (!bus) bus = new EventBus('security-service');
  return bus;
}

async function tid(req: express.Request) {
  return resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
}

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'security' }));

app.get('/posture', async (req, res) => {
  try {
    res.json(await engine.getSecurityPosture(await tid(req)));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/fraud', async (req, res) => {
  try {
    const alerts = await engine.listFraudAlerts(await tid(req), (req.query.status as string) ?? 'open');
    res.json({ alerts });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/anomalies', async (req, res) => {
  try {
    res.json({ anomalies: await engine.listAnomalies(await tid(req)) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/analyze', async (req, res) => {
  try {
    const tenantId = await tid(req);
    const result = await engine.analyzeTelemetry(tenantId, req.body.metrics ?? []);
    const eventBus = getBus();
    await eventBus.connect();
    for (const f of result.fraudAlerts) {
      await eventBus.publish(TOPICS.FRAUD_DETECTED, createEvent('fraud.detected', tenantId, f));
      await triggerFraudAgent(tenantId, f);
    }
    for (const a of result.anomalies) {
      await eventBus.publish(TOPICS.ANOMALY_DETECTED, createEvent('anomaly.detected', tenantId, a));
    }
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/siem/webhook', async (req, res) => {
  try {
    const tenantId = await tid(req);
    const result = await engine.ingestSiemEvent(tenantId, req.body);
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(TOPICS.SIEM_EVENT, createEvent('siem.event', tenantId, result));
    res.status(201).json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/siem/events', async (req, res) => {
  try {
    res.json({ events: await engine.listSiemEvents(await tid(req)) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

async function triggerFraudAgent(tenantId: string, alert: unknown) {
  const url = process.env.AI_AGENTS_URL ?? 'http://localhost:5000';
  await fetch(`${url}/api/v1/agents/trigger/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType: 'security.anomaly', tenantId, payload: alert }),
  }).catch(() => undefined);
}

const port = Number(process.env.SECURITY_PORT ?? 4006);
app.listen(port, () => console.log(`Security service on :${port}`));

process.on('SIGTERM', async () => {
  await getBus().disconnect();
  await closePool();
  process.exit(0);
});
