import express from 'express';
import { closePool, resolveTenantId } from '@opsedge360/shared-db';
import { createLogger } from '@opsedge360/shared-logger';
import * as scheduler from './scheduler.service';
import { startSchedulerRunner, stopSchedulerRunner } from './runner';

const log = createLogger('scheduler-service');
const app = express();
app.use(express.json());

async function tenantFrom(req: express.Request): Promise<string> {
  return resolveTenantId(req.headers['x-tenant-id'] as string);
}

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'scheduler' }));
app.get('/ready', (_, res) => res.json({ status: 'ready', service: 'scheduler' }));
app.get('/live', (_, res) => res.json({ status: 'live', service: 'scheduler' }));
app.get('/metrics', (_, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# HELP scheduler_up Scheduler service availability\nscheduler_up 1\n');
});

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
