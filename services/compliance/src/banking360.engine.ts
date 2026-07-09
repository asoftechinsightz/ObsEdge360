import { query, queryOne } from '@opsedge360/shared-db';
import * as packs from './industry-packs.engine';
import * as engine from './compliance.engine';

const BFSI_PACK = 'bfsi';
const RBI = 'RBI-CSF';
const PCI = 'PCI-DSS';

export async function getBanking360Dashboard(tenantId: string) {
  const pack = await packs.getIndustryPack(tenantId, BFSI_PACK);
  const frameworks = await engine.listFrameworks(tenantId);
  const rbi = frameworks.find((f) => f.code === RBI);
  const pci = frameworks.find((f) => f.code === PCI);

  const rbiControls = pack?.enabled ? await engine.listControls(tenantId, RBI) : [];
  const pciControls = pack?.enabled ? await engine.listControls(tenantId, PCI) : [];

  const paymentTx = await query<{
    id: string;
    name: string;
    classification: string;
    p50_latency_ms: number | null;
    p99_latency_ms: number | null;
    volume_per_hour: number;
    status: string;
  }>(
    `SELECT id, name, classification, p50_latency_ms, p99_latency_ms, volume_per_hour, status
     FROM business_transactions
     WHERE tenant_id = $1
       AND classification IN ('upi_payment', 'neft_transfer', 'imps', 'rtgs_transfer')
     ORDER BY name`,
    [tenantId],
  );

  const templates = await listPaymentTemplates();
  const sloSummary = await queryOne<{ total: string; met: string }>(
    `SELECT COUNT(*)::text as total,
      COUNT(*) FILTER (
        WHERE t.p99_latency_ms IS NOT NULL AND t.p99_latency_ms <= s.target_value
      )::text as met
     FROM transaction_slos s
     JOIN business_transactions t ON t.id = s.transaction_id
     WHERE s.tenant_id = $1
       AND t.classification IN ('upi_payment', 'neft_transfer', 'imps', 'rtgs_transfer')`,
    [tenantId],
  );

  const rbiScore = rbi?.score ?? 0;
  const pciScore = pci?.score ?? 0;
  const bankingScore = pack?.enabled
    ? Math.round((rbiScore + pciScore) / (rbi && pci ? 2 : rbi || pci ? 1 : 1) || 0)
    : 0;

  return {
    pack: pack ?? {
      code: BFSI_PACK,
      name: 'BFSI Regulated Pack',
      industry: 'banking',
      enabled: false,
      frameworkCodes: [RBI, PCI, 'SOC2'],
      controlCount: 0,
    },
    enabled: pack?.enabled ?? false,
    bankingScore,
    frameworks: {
      rbi: rbi ?? { code: RBI, name: 'RBI Cyber Security Framework', score: 0, controlsTotal: 0, controlsPassed: 0 },
      pci: pci ?? { code: PCI, name: 'PCI DSS', score: 0, controlsTotal: 0, controlsPassed: 0 },
    },
    controls: {
      rbi: summarizeControls(rbiControls),
      pci: summarizeControls(pciControls),
      rbiList: rbiControls,
      pciList: pciControls,
    },
    payments: {
      transactions: paymentTx.map((t) => ({
        id: t.id,
        name: t.name,
        classification: t.classification,
        p50LatencyMs: t.p50_latency_ms,
        p99LatencyMs: t.p99_latency_ms,
        volumePerHour: t.volume_per_hour,
        status: t.status,
      })),
      templates,
      sloTotal: Number(sloSummary?.total ?? 0),
      sloMet: Number(sloSummary?.met ?? 0),
    },
  };
}

function summarizeControls(
  controls: Array<{ status: string }>,
) {
  const total = controls.length;
  const passed = controls.filter((c) => c.status === 'pass').length;
  const failed = controls.filter((c) => c.status === 'fail').length;
  const pending = controls.filter((c) => c.status === 'pending' || c.status === 'partial').length;
  return { total, passed, failed, pending };
}

export async function activateBanking360(tenantId: string) {
  const pack = await packs.enableIndustryPack(tenantId, BFSI_PACK);

  // Ensure payment templates are applied as monitored transactions
  const templates = await listPaymentTemplates();
  for (const tpl of templates.filter((t) =>
    ['UPI-P2P', 'NEFT-OUT', 'IMPS-OUT'].includes(t.code),
  )) {
    await ensurePaymentTransaction(tenantId, tpl);
  }

  // Run validation for RBI and PCI
  await engine.runValidation(tenantId, RBI).catch(() => undefined);
  await engine.runValidation(tenantId, PCI).catch(() => undefined);

  return getBanking360Dashboard(tenantId);
}

export async function deactivateBanking360(tenantId: string) {
  await packs.disableIndustryPack(tenantId, BFSI_PACK);
  return getBanking360Dashboard(tenantId);
}

export async function listPaymentTemplates() {
  const rows = await query<{
    code: string;
    name: string;
    classification: string;
    description: string | null;
    steps: Array<{ order: number; name: string; service: string }>;
    slo_p99_ms: number;
  }>('SELECT * FROM payment_flow_templates ORDER BY code');

  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    classification: r.classification,
    description: r.description ?? undefined,
    steps: r.steps,
    sloP99Ms: r.slo_p99_ms,
  }));
}

export async function applyPaymentTemplate(tenantId: string, templateCode: string) {
  const tpl = await queryOne<{
    code: string;
    name: string;
    classification: string;
    steps: Array<{ order: number; name: string; service: string }>;
    slo_p99_ms: number;
  }>('SELECT * FROM payment_flow_templates WHERE code = $1', [templateCode]);

  if (!tpl) throw new Error(`Payment template '${templateCode}' not found`);

  const tx = await ensurePaymentTransaction(tenantId, {
    code: tpl.code,
    name: tpl.name,
    classification: tpl.classification,
    steps: tpl.steps,
    sloP99Ms: tpl.slo_p99_ms,
  });

  return tx;
}

async function ensurePaymentTransaction(
  tenantId: string,
  tpl: {
    code: string;
    name: string;
    classification: string;
    steps: Array<{ order: number; name: string; service: string }>;
    sloP99Ms: number;
  },
) {
  let row = await queryOne<{ id: string }>(
    `SELECT id FROM business_transactions
     WHERE tenant_id = $1 AND classification = $2 AND template_code = $3`,
    [tenantId, tpl.classification, tpl.code],
  );

  if (!row) {
    row = await queryOne<{ id: string }>(
      `INSERT INTO business_transactions
        (tenant_id, name, classification, template_code, p50_latency_ms, p99_latency_ms, volume_per_hour, slo_target_ms)
       VALUES ($1,$2,$3,$4,$5,$6,0,$7) RETURNING id`,
      [
        tenantId,
        tpl.name,
        tpl.classification,
        tpl.code,
        Math.round(tpl.sloP99Ms * 0.5),
        tpl.sloP99Ms,
        tpl.sloP99Ms,
      ],
    );
  }

  if (!row) throw new Error('Failed to create payment transaction');

  await query('DELETE FROM transaction_steps WHERE transaction_id = $1', [row.id]);
  for (const step of tpl.steps) {
    await query(
      `INSERT INTO transaction_steps (transaction_id, step_order, step_type, name, avg_latency_ms, p99_latency_ms, status)
       VALUES ($1,$2,'service',$3,$4,$5,'ok')`,
      [
        row.id,
        step.order,
        step.name,
        Math.round(tpl.sloP99Ms / Math.max(tpl.steps.length, 1)),
        Math.round((tpl.sloP99Ms / Math.max(tpl.steps.length, 1)) * 1.5),
      ],
    );
  }

  // Default SLO for the payment flow
  await query(
    `INSERT INTO transaction_slos (tenant_id, transaction_id, name, metric, target_value, window_hours)
     VALUES ($1,$2,$3,'p99_latency_ms',$4,24)
     ON CONFLICT (tenant_id, transaction_id, name) DO UPDATE SET target_value = EXCLUDED.target_value`,
    [tenantId, row.id, `${tpl.code} p99`, tpl.sloP99Ms],
  );

  return {
    id: row.id,
    name: tpl.name,
    classification: tpl.classification,
    templateCode: tpl.code,
    sloP99Ms: tpl.sloP99Ms,
    steps: tpl.steps,
  };
}

export async function runBankingValidation(tenantId: string) {
  const pack = await packs.getIndustryPack(tenantId, BFSI_PACK);
  if (!pack?.enabled) throw new Error('Banking360 / BFSI pack is not enabled');

  const rbi = await engine.runValidation(tenantId, RBI);
  const pci = await engine.runValidation(tenantId, PCI);

  return {
    rbi: { score: rbi.overallScore, violations: rbi.violations.length },
    pci: { score: pci.overallScore, violations: pci.violations.length },
    overallScore: Math.round((rbi.overallScore + pci.overallScore) / 2),
  };
}
