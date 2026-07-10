import express from 'express';
import { resolveTenantId, closePool, mountOpsEndpoints } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';
import * as repo from './transaction.repository';

const app = express();
app.use(express.json());

mountOpsEndpoints(app, { service: 'transactions', version: '1.0.0' });

let bus: EventBus | null = null;
function getBus() {
  if (!bus) bus = new EventBus('transactions-service');
  return bus;
}

async function tenantId(req: express.Request): Promise<string> {
  return resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
}

function paramId(req: express.Request, name = 'id'): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

app.get('/transactions', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const items = await repo.listTransactions(tid);
    res.json({ total: items.length, transactions: items });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/transactions/templates', (_, res) => {
  res.json({ templates: repo.TRANSACTION_TEMPLATES });
});

app.get('/transactions/slos', async (req, res) => {
  try {
    const tid = await tenantId(req);
    res.json(await repo.getSloDashboard(tid));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/transactions/slos', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const body = req.body;
    const row = await repo.createSlo(tid, {
      transactionId: body.transactionId,
      name: body.name,
      metric: body.metric,
      targetValue: Number(body.targetValue ?? body.target_value),
      windowHours: body.windowHours ?? body.window_hours,
    });
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.delete('/transactions/slos/:id', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const ok = await repo.deleteSlo(tid, paramId(req));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/transactions/by-classification/:classification', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const classification = paramId(req, 'classification');
    const tx = await repo.getByClassification(tid, classification);
    if (!tx) return res.status(404).json({ error: 'Not found' });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/transactions/:id/flow', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const flow = await repo.getFlowMap(tid, paramId(req));
    if (!flow) return res.status(404).json({ error: 'Not found' });
    res.json(flow);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/transactions/:id/correlate', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const result = await repo.correlateWithTraces(tid, paramId(req));
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/transactions/:id/latency', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const hours = Number(req.query.hours ?? 24);
    res.json(await repo.getLatencySeries(tid, paramId(req), hours));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/transactions/:id/samples', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const id = paramId(req);
    await repo.recordSample(tid, id, {
      traceId: req.body.traceId,
      latencyMs: Number(req.body.latencyMs ?? req.body.latency_ms ?? 0),
      status: req.body.status,
      stepCount: req.body.stepCount ?? req.body.step_count,
    });
    res.status(201).json({ recorded: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/transactions/:id', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const tx = await repo.getTransaction(tid, paramId(req));
    if (!tx) return res.status(404).json({ error: 'Not found' });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Discover/classify transaction from distributed trace */
app.post('/transactions/discover', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const tx = await repo.discoverFromTrace(tid, req.body);
    const eventBus = getBus();
    await eventBus.connect();
    await eventBus.publish(TOPICS.TRANSACTION_DISCOVERED, createEvent('transaction.discovered', tid, { transactionId: tx.id, classification: tx.classification }));

    // Record a sample from the discovered trace
    const totalLatency = (req.body.spans ?? []).reduce(
      (s: number, sp: { durationMs?: number }) => s + Number(sp.durationMs ?? 0),
      0,
    );
    if (totalLatency > 0) {
      await repo.recordSample(tid, tx.id, {
        latencyMs: Math.round(totalLatency),
        stepCount: (req.body.spans ?? []).length,
        status: 'ok',
      });
    }

    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** Classify a trace name without persisting */
app.post('/transactions/classify', (req, res) => {
  const { traceName, attributes } = req.body;
  res.json({ classification: repo.classifyTrace(traceName ?? '', attributes ?? {}) });
});

const port = Number(process.env.TRANSACTIONS_PORT ?? 4005);
app.listen(port, () => console.log(`Transactions service on :${port}`));

process.on('SIGTERM', async () => {
  await getBus().disconnect();
  await closePool();
  process.exit(0);
});
