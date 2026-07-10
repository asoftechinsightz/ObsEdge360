import express from 'express';
import { resolveTenantId, closePool, mountOpsEndpoints } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';
import * as engine from './compliance.engine';
import * as packs from './industry-packs.engine';
import * as banking from './banking360.engine';

const app = express();
app.use(express.json());

mountOpsEndpoints(app, { service: 'compliance', version: '1.0.0' });

let bus: EventBus | null = null;
function getBus() {
  if (!bus) bus = new EventBus('compliance-service');
  return bus;
}

async function tenantId(req: express.Request): Promise<string> {
  return resolveTenantId((req.headers['x-tenant-id'] as string) ?? 'default');
}

function paramId(req: express.Request, name = 'id'): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

app.get('/frameworks', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const frameworks = await engine.listFrameworks(tid);
    res.json({ frameworks });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/controls', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const controls = await engine.listControls(tid, req.query.framework as string);
    res.json({ controls });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/score', async (req, res) => {
  try {
    const tid = await tenantId(req);
    res.json(await engine.getOverallScore(tid));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/validate', async (req, res) => {
  try {
    const tid = await tenantId(req);
    const result = await engine.runValidation(tid, req.body?.framework);
    const eventBus = getBus();
    await eventBus.connect();
    for (const v of result.violations) {
      await eventBus.publish(TOPICS.COMPLIANCE_VIOLATION, createEvent('compliance.violation', tid, v));
    }
    await eventBus.publish(TOPICS.COMPLIANCE_CHECKED, createEvent('compliance.checked', tid, { score: result.overallScore }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/packs', async (req, res) => {
  try {
    res.json({ packs: await packs.listIndustryPacks(await tenantId(req)) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/packs/:code', async (req, res) => {
  try {
    const pack = await packs.getIndustryPack(await tenantId(req), paramId(req, 'code'));
    if (!pack) return res.status(404).json({ error: 'Pack not found' });
    res.json(pack);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/packs/:code/enable', async (req, res) => {
  try {
    const pack = await packs.enableIndustryPack(await tenantId(req), paramId(req, 'code'));
    res.json(pack);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/packs/:code/disable', async (req, res) => {
  try {
    res.json(await packs.disableIndustryPack(await tenantId(req), paramId(req, 'code')));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// --- Banking360 ---
app.get('/banking360', async (req, res) => {
  try {
    res.json(await banking.getBanking360Dashboard(await tenantId(req)));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/banking360/activate', async (req, res) => {
  try {
    res.json(await banking.activateBanking360(await tenantId(req)));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/banking360/deactivate', async (req, res) => {
  try {
    res.json(await banking.deactivateBanking360(await tenantId(req)));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/banking360/validate', async (req, res) => {
  try {
    res.json(await banking.runBankingValidation(await tenantId(req)));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.get('/banking360/payment-templates', async (req, res) => {
  try {
    res.json({ templates: await banking.listPaymentTemplates() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/banking360/payment-templates/:code/apply', async (req, res) => {
  try {
    const tx = await banking.applyPaymentTemplate(await tenantId(req), paramId(req, 'code'));
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Scheduled validation every 5 minutes
const VALIDATION_INTERVAL_MS = Number(process.env.COMPLIANCE_INTERVAL_MS ?? 300000);

async function startScheduler() {
  setInterval(async () => {
    try {
      const tid = await resolveTenantId('default');
      const result = await engine.runValidation(tid);
      console.log(`[compliance] Scheduled validation: score=${result.overallScore}, violations=${result.violations.length}`);
    } catch (err) {
      console.warn('[compliance] Scheduled validation failed:', (err as Error).message);
    }
  }, VALIDATION_INTERVAL_MS);
}

const port = Number(process.env.COMPLIANCE_PORT ?? 4004);
app.listen(port, () => {
  console.log(`Compliance service on :${port}`);
  startScheduler();
});

process.on('SIGTERM', async () => {
  await getBus().disconnect();
  await closePool();
  process.exit(0);
});
