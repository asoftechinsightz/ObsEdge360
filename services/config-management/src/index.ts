import express from 'express';
import { closePool, resolveTenantId } from '@opsedge360/shared-db';
import { createLogger } from '@opsedge360/shared-logger';
import * as config from './config.service';

const log = createLogger('config-management');
const app = express();
app.use(express.json());

async function tenantFrom(req: express.Request): Promise<string> {
  return resolveTenantId(req.headers['x-tenant-id'] as string);
}

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'config-management' }));
app.get('/ready', (_, res) => res.json({ status: 'ready' }));
app.get('/live', (_, res) => res.json({ status: 'live' }));
app.get('/metrics', (_, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('config_management_up 1\n');
});

app.get('/templates', async (req, res) => {
  const tenantId = await tenantFrom(req);
  res.json({ templates: await config.listTemplates(tenantId) });
});

app.post('/templates', async (req, res) => {
  try {
    const tenantId = await tenantFrom(req);
    const template = await config.createTemplate(tenantId, req.body);
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/deploy', async (req, res) => {
  try {
    const tenantId = await tenantFrom(req);
    const result = await config.deployTemplate(tenantId, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/deployments/:id/rollback', async (req, res) => {
  try {
    const tenantId = await tenantFrom(req);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const ok = await config.rollbackDeployment(tenantId, id);
    if (!ok) return res.status(404).json({ error: 'Deployment not found' });
    res.json({ rolledBack: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/drift/detect', async (req, res) => {
  try {
    const tenantId = await tenantFrom(req);
    const result = await config.detectDrift(tenantId, req.body.ciId, req.body.expected, req.body.actual);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

const port = Number(process.env.CONFIG_MANAGEMENT_PORT ?? 4012);
app.listen(port, () => log.info('Config management service listening', { port }));

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});
