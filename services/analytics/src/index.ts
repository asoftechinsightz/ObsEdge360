import express from 'express';
import { resolveTenantId, closePool } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';
import * as engine from './analytics.engine';

const app = express();
app.use(express.json());

let bus: EventBus | null = null;
function getBus() {
  if (!bus) bus = new EventBus('analytics-service');
  return bus;
}

async function tid(req: express.Request) {
  return resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
}

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'analytics' }));

app.get('/summary', async (req, res) => {
  try {
    res.json(await engine.getAnalyticsSummary(await tid(req)));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/forecasts', async (req, res) => {
  try {
    const forecasts = await engine.listForecasts(await tid(req), req.query.type as string);
    res.json({ forecasts });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/incidents', async (req, res) => {
  try {
    res.json({ predictions: await engine.listIncidentPredictions(await tid(req)) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/forecast/generate', async (req, res) => {
  try {
    const tenantId = await tid(req);
    const result = await engine.generateForecasts(tenantId, req.body?.metrics);
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(TOPICS.FORECAST_GENERATED, createEvent('forecast.generated', tenantId, { count: result.count }));
    await triggerPredictiveAgent(tenantId, result);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

async function triggerPredictiveAgent(tenantId: string, result: unknown) {
  const url = process.env.AI_AGENTS_URL ?? 'http://localhost:5000';
  await fetch(`${url}/api/v1/agents/trigger/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType: 'analytics.forecast', tenantId, payload: result }),
  }).catch(() => undefined);
}

const port = Number(process.env.ANALYTICS_PORT ?? 4008);
app.listen(port, () => console.log(`Analytics service on :${port}`));

process.on('SIGTERM', async () => {
  await getBus().disconnect();
  await closePool();
  process.exit(0);
});
