import express from 'express';
import { resolveTenantId, closePool } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';
import * as engine from './quantum.engine';

const app = express();
app.use(express.json());

let bus: EventBus | null = null;
function getBus() {
  if (!bus) bus = new EventBus('quantum-service');
  return bus;
}

async function tid(req: express.Request) {
  return resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
}

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'quantum' }));

app.get('/summary', async (req, res) => {
  try {
    res.json(await engine.getQuantumSummary(await tid(req)));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/jobs', async (req, res) => {
  try {
    res.json({ jobs: await engine.listJobs(await tid(req), req.query.status as string) });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/jobs', async (req, res) => {
  try {
    const tenantId = await tid(req);
    const job = await engine.submitJob(tenantId, req.body);
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(TOPICS.QUANTUM_JOB_SUBMITTED, createEvent('quantum.job.submitted', tenantId, job));
    res.status(201).json(job);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.get('/readiness', async (req, res) => {
  try {
    const readiness = await engine.getLatestReadiness(await tid(req));
    res.json(readiness ?? { score: 0, assessmentType: 'pqc_migration', message: 'No assessment yet' });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post('/readiness/assess', async (req, res) => {
  try {
    const tenantId = await tid(req);
    const result = await engine.assessPqcReadiness(tenantId);
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(TOPICS.QUANTUM_READINESS_ASSESSED, createEvent('quantum.readiness.assessed', tenantId, result));
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

const port = Number(process.env.QUANTUM_PORT ?? 4009);
app.listen(port, () => console.log(`Quantum service on :${port}`));

process.on('SIGTERM', async () => {
  await getBus().disconnect();
  await closePool();
  process.exit(0);
});
