import express from 'express';
import { closePool, resolveTenantId, mountOpsEndpoints } from '@opsedge360/shared-db';
import { createLogger } from '@opsedge360/shared-logger';
import * as scheduler from './scheduler.service';
import { startSchedulerRunner, stopSchedulerRunner } from './runner';

const log = createLogger('scheduler-service');
const app = express();
app.use(express.json());

/** EXPERIMENTAL / non-production (ADR-003 Option B). Not in docker-compose.prod.yml. */
mountOpsEndpoints(app, {
  service: 'scheduler',
  version: '1.0.0-experimental',
});

async function tenantFrom(req: express.Request): Promise<string> {
  return resolveTenantId(req.headers['x-tenant-id'] as string);
}

app.get('/jobs', async (req, res) => {
  try {
    const tenantId = await tenantFrom(req);
    const jobs = await scheduler.listJobs(tenantId);
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/jobs', async (req, res) => {
  try {
    const tenantId = await tenantFrom(req);
    const job = await scheduler.createJob(tenantId, req.body);
    res.status(201).json(job);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/dead-letter', async (req, res) => {
  try {
    const tenantId = await tenantFrom(req);
    const items = await scheduler.listDeadLetter(tenantId);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const port = Number(process.env.SCHEDULER_PORT ?? 4011);
startSchedulerRunner();
app.listen(port, () => log.info('Scheduler service listening', { port }));

process.on('SIGTERM', async () => {
  stopSchedulerRunner();
  await closePool();
  process.exit(0);
});
