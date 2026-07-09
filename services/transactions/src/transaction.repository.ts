import type { BusinessTransaction, TransactionStep } from '@opsedge360/shared-types';
import { query, queryOne } from '@opsedge360/shared-db';

interface TxRow {
  id: string;
  tenant_id: string;
  service_id: string | null;
  name: string;
  classification: string;
  template_code: string | null;
  entry_ci_id: string | null;
  p50_latency_ms: number | null;
  p99_latency_ms: number | null;
  volume_per_hour: number;
  status: string;
}

interface StepRow {
  id: string;
  transaction_id: string;
  step_order: number;
  step_type: string;
  name: string;
  ci_id: string | null;
  avg_latency_ms: number;
  p99_latency_ms: number;
  status: string;
}

function mapTx(row: TxRow): BusinessTransaction {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    serviceId: row.service_id ?? undefined,
    name: row.name,
    classification: row.classification,
    templateCode: row.template_code ?? undefined,
    entryCiId: row.entry_ci_id ?? undefined,
    p50LatencyMs: row.p50_latency_ms ?? undefined,
    p99LatencyMs: row.p99_latency_ms ?? undefined,
    volumePerHour: row.volume_per_hour,
    status: row.status,
  };
}

function mapStep(row: StepRow): TransactionStep {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    stepOrder: row.step_order,
    stepType: row.step_type,
    name: row.name,
    ciId: row.ci_id ?? undefined,
    avgLatencyMs: row.avg_latency_ms,
    p99LatencyMs: row.p99_latency_ms,
    status: row.status as TransactionStep['status'],
  };
}

export async function listTransactions(tenantId: string): Promise<BusinessTransaction[]> {
  const rows = await query<TxRow>(
    'SELECT * FROM business_transactions WHERE tenant_id = $1 ORDER BY name',
    [tenantId],
  );
  return rows.map(mapTx);
}

export async function getTransaction(tenantId: string, id: string): Promise<BusinessTransaction | null> {
  const row = await queryOne<TxRow>(
    'SELECT * FROM business_transactions WHERE tenant_id = $1 AND id = $2',
    [tenantId, id],
  );
  if (!row) return null;
  const tx = mapTx(row);
  const steps = await query<StepRow>(
    'SELECT * FROM transaction_steps WHERE transaction_id = $1 ORDER BY step_order',
    [id],
  );
  tx.steps = steps.map(mapStep);
  return tx;
}

export async function getByClassification(tenantId: string, classification: string): Promise<BusinessTransaction | null> {
  const row = await queryOne<TxRow>(
    'SELECT * FROM business_transactions WHERE tenant_id = $1 AND classification = $2 LIMIT 1',
    [tenantId, classification],
  );
  if (!row) return null;
  return getTransaction(tenantId, row.id);
}

/** Classify trace/log pattern into a transaction template */
export function classifyTrace(traceName: string, attributes: Record<string, unknown> = {}): string {
  const name = traceName.toLowerCase();
  const hints = [
    { match: ['upi', 'payment.upi'], classification: 'upi_payment' },
    { match: ['neft'], classification: 'neft_transfer' },
    { match: ['rtgs'], classification: 'rtgs_transfer' },
    { match: ['imps'], classification: 'imps' },
    { match: ['login', 'auth.signin'], classification: 'login' },
    { match: ['loan'], classification: 'loan_processing' },
    { match: ['claim'], classification: 'insurance_claim' },
    { match: ['checkout', 'order'], classification: 'retail_checkout' },
  ];
  for (const h of hints) {
    if (h.match.some((m) => name.includes(m))) return h.classification;
  }
  if (attributes.classification) return String(attributes.classification);
  return 'custom';
}

export async function discoverFromTrace(
  tenantId: string,
  trace: { name: string; spans: Array<{ name: string; durationMs: number; serviceName?: string }> },
): Promise<BusinessTransaction> {
  const classification = classifyTrace(trace.name);
  const templateNames: Record<string, string> = {
    upi_payment: 'UPI Payment',
    neft_transfer: 'NEFT Transfer',
    rtgs_transfer: 'RTGS Transfer',
    imps: 'IMPS Transfer',
    login: 'Customer Login',
    loan_processing: 'Loan Processing',
    insurance_claim: 'Insurance Claim',
    retail_checkout: 'Retail Checkout',
    custom: trace.name,
  };

  let row = await queryOne<TxRow>(
    'SELECT * FROM business_transactions WHERE tenant_id = $1 AND classification = $2',
    [tenantId, classification],
  );

  if (!row) {
    row = await queryOne<TxRow>(
      `INSERT INTO business_transactions (tenant_id, name, classification, template_code, p50_latency_ms, p99_latency_ms)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [tenantId, templateNames[classification] ?? trace.name, classification, `AUTO-${classification.toUpperCase()}`, 0, 0],
    );
  }

  // Map spans to steps
  await query('DELETE FROM transaction_steps WHERE transaction_id = $1', [row!.id]);
  for (let i = 0; i < trace.spans.length; i++) {
    const span = trace.spans[i];
    const ci = span.serviceName
      ? await queryOne<{ id: string }>(
          'SELECT id FROM configuration_items WHERE tenant_id = $1 AND name ILIKE $2 LIMIT 1',
          [tenantId, `%${span.serviceName}%`],
        )
      : null;

    await query(
      `INSERT INTO transaction_steps (transaction_id, step_order, step_type, name, ci_id, avg_latency_ms, p99_latency_ms, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        row!.id, i + 1, 'service', span.name, ci?.id ?? null,
        Math.round(span.durationMs), Math.round(span.durationMs * 1.5),
        span.durationMs > 500 ? 'warn' : 'ok',
      ],
    );
  }

  return (await getTransaction(tenantId, row!.id))!;
}

export const TRANSACTION_TEMPLATES = [
  { code: 'BFSI-UPI', classification: 'upi_payment', name: 'UPI Payment', industry: 'banking' },
  { code: 'BFSI-NEFT', classification: 'neft_transfer', name: 'NEFT Transfer', industry: 'banking' },
  { code: 'BFSI-RTGS', classification: 'rtgs_transfer', name: 'RTGS Transfer', industry: 'banking' },
  { code: 'BFSI-IMPS', classification: 'imps', name: 'IMPS Transfer', industry: 'banking' },
  { code: 'BFSI-LOGIN', classification: 'login', name: 'Customer Login', industry: 'banking' },
  { code: 'HC-CLAIM', classification: 'insurance_claim', name: 'Insurance Claim', industry: 'healthcare' },
  { code: 'RETAIL-CO', classification: 'retail_checkout', name: 'Retail Checkout', industry: 'retail' },
  { code: 'MFG-BATCH', classification: 'custom', name: 'Manufacturing Batch', industry: 'manufacturing' },
];

export async function getFlowMap(tenantId: string, transactionId: string) {
  const tx = await getTransaction(tenantId, transactionId);
  if (!tx) return null;

  const steps = tx.steps ?? [];
  const nodes = steps.map((s) => ({
    id: s.id,
    label: s.name,
    stepOrder: s.stepOrder,
    stepType: s.stepType,
    avgLatencyMs: s.avgLatencyMs,
    p99LatencyMs: s.p99LatencyMs,
    status: s.status,
    ciId: s.ciId,
  }));

  const edges = [];
  for (let i = 0; i < steps.length - 1; i++) {
    edges.push({
      source: steps[i].id,
      target: steps[i + 1].id,
      latencyMs: steps[i + 1].avgLatencyMs,
    });
  }

  return {
    transaction: {
      id: tx.id,
      name: tx.name,
      classification: tx.classification,
      p50LatencyMs: tx.p50LatencyMs,
      p99LatencyMs: tx.p99LatencyMs,
      volumePerHour: tx.volumePerHour,
      status: tx.status,
    },
    nodes,
    edges,
  };
}

/** Correlate transaction steps with OTLP spans by service/step name. */
export async function correlateWithTraces(tenantId: string, transactionId: string) {
  const tx = await getTransaction(tenantId, transactionId);
  if (!tx) return null;

  const steps = tx.steps ?? [];
  const correlations = [];

  for (const step of steps) {
    const spans = await query<{
      trace_id: string;
      span_id: string;
      name: string;
      service_name: string;
      duration_ms: string;
      status_code: string;
      recorded_at: string;
    }>(
      `SELECT trace_id, span_id, name, service_name, duration_ms::text, status_code, recorded_at::text
       FROM otlp_spans
       WHERE tenant_id = $1
         AND recorded_at > NOW() - INTERVAL '24 hours'
         AND (
           name ILIKE $2
           OR service_name ILIKE $2
           OR name ILIKE $3
         )
       ORDER BY recorded_at DESC
       LIMIT 10`,
      [tenantId, `%${step.name}%`, step.ciId ? `%${step.ciId}%` : `%${step.name.split(' ')[0]}%`],
    );

    const durations = spans.map((s) => Number(s.duration_ms));
    const avg =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : step.avgLatencyMs;

    correlations.push({
      stepId: step.id,
      stepName: step.name,
      stepOrder: step.stepOrder,
      stepLatencyMs: step.avgLatencyMs,
      correlatedSpans: spans.length,
      liveAvgLatencyMs: avg,
      deltaMs: avg - step.avgLatencyMs,
      recentTraces: [...new Set(spans.map((s) => s.trace_id))].slice(0, 5),
      spans: spans.map((s) => ({
        traceId: s.trace_id,
        spanId: s.span_id,
        name: s.name,
        serviceName: s.service_name,
        durationMs: Number(s.duration_ms),
        statusCode: s.status_code,
        recordedAt: s.recorded_at,
      })),
    });
  }

  // Update transaction latency from live correlation when available
  const liveLatencies = correlations
    .filter((c) => c.correlatedSpans > 0)
    .map((c) => c.liveAvgLatencyMs);
  if (liveLatencies.length > 0) {
    const total = liveLatencies.reduce((a, b) => a + b, 0);
    const p50 = Math.round(total / liveLatencies.length);
    const p99 = Math.round(Math.max(...liveLatencies) * 1.2);
    await query(
      `UPDATE business_transactions
       SET p50_latency_ms = $3, p99_latency_ms = $4, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, transactionId, p50, p99],
    );
  }

  return {
    transactionId,
    transactionName: tx.name,
    classification: tx.classification,
    correlations,
    correlatedSteps: correlations.filter((c) => c.correlatedSpans > 0).length,
    totalSteps: steps.length,
  };
}

export async function recordSample(
  tenantId: string,
  transactionId: string,
  data: { traceId?: string; latencyMs: number; status?: string; stepCount?: number },
) {
  await query(
    `INSERT INTO transaction_samples (tenant_id, transaction_id, trace_id, latency_ms, status, step_count)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      tenantId,
      transactionId,
      data.traceId ?? null,
      data.latencyMs,
      data.status ?? 'ok',
      data.stepCount ?? 0,
    ],
  );

  // Refresh percentiles from recent samples
  const stats = await queryOne<{ p50: string; p99: string; vol: string }>(
    `SELECT
      COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms), 0)::text as p50,
      COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms), 0)::text as p99,
      COUNT(*)::text as vol
     FROM transaction_samples
     WHERE tenant_id = $1 AND transaction_id = $2
       AND recorded_at > NOW() - INTERVAL '1 hour'`,
    [tenantId, transactionId],
  );

  if (stats) {
    await query(
      `UPDATE business_transactions
       SET p50_latency_ms = $3, p99_latency_ms = $4, volume_per_hour = $5, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [
        tenantId,
        transactionId,
        Math.round(Number(stats.p50)),
        Math.round(Number(stats.p99)),
        Number(stats.vol),
      ],
    );
  }
}

export async function listSlos(tenantId: string, transactionId?: string) {
  if (transactionId) {
    return query(
      `SELECT s.*, t.name as transaction_name, t.classification, t.p50_latency_ms, t.p99_latency_ms
       FROM transaction_slos s
       JOIN business_transactions t ON t.id = s.transaction_id
       WHERE s.tenant_id = $1 AND s.transaction_id = $2
       ORDER BY s.name`,
      [tenantId, transactionId],
    );
  }
  return query(
    `SELECT s.*, t.name as transaction_name, t.classification, t.p50_latency_ms, t.p99_latency_ms
     FROM transaction_slos s
     JOIN business_transactions t ON t.id = s.transaction_id
     WHERE s.tenant_id = $1
     ORDER BY t.name, s.name`,
    [tenantId],
  );
}

export async function createSlo(
  tenantId: string,
  data: {
    transactionId: string;
    name: string;
    metric?: string;
    targetValue: number;
    windowHours?: number;
  },
) {
  const row = await queryOne(
    `INSERT INTO transaction_slos (tenant_id, transaction_id, name, metric, target_value, window_hours)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      tenantId,
      data.transactionId,
      data.name,
      data.metric ?? 'p99_latency_ms',
      data.targetValue,
      data.windowHours ?? 24,
    ],
  );

  await query(
    `UPDATE business_transactions SET slo_target_ms = $3 WHERE tenant_id = $1 AND id = $2`,
    [tenantId, data.transactionId, data.targetValue],
  );

  return row;
}

export async function deleteSlo(tenantId: string, id: string) {
  const rows = await query(
    'DELETE FROM transaction_slos WHERE tenant_id = $1 AND id = $2 RETURNING id',
    [tenantId, id],
  );
  return rows.length > 0;
}

export async function getSloDashboard(tenantId: string) {
  const slos = await listSlos(tenantId);
  const results = [];

  for (const slo of slos) {
    const metric = String(slo.metric);
    const windowHours = Number(slo.window_hours);
    const target = Number(slo.target_value);
    const txId = String(slo.transaction_id);

    let currentValue = 0;
    let sampleCount = 0;
    let breachCount = 0;

    if (metric === 'p99_latency_ms' || metric === 'p50_latency_ms' || metric === 'latency_ms') {
      const stats = await queryOne<{ p50: string; p99: string; total: string; breaches: string }>(
        `SELECT
          COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms), 0)::text as p50,
          COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms), 0)::text as p99,
          COUNT(*)::text as total,
          COUNT(*) FILTER (WHERE latency_ms > $3)::text as breaches
         FROM transaction_samples
         WHERE tenant_id = $1 AND transaction_id = $2
           AND recorded_at > NOW() - ($4 * INTERVAL '1 hour')`,
        [tenantId, txId, target, windowHours],
      );

      currentValue =
        metric === 'p50_latency_ms'
          ? Math.round(Number(stats?.p50 ?? slo.p50_latency_ms ?? 0))
          : Math.round(Number(stats?.p99 ?? slo.p99_latency_ms ?? 0));
      sampleCount = Number(stats?.total ?? 0);
      breachCount = Number(stats?.breaches ?? 0);

      // Fall back to transaction table if no samples
      if (sampleCount === 0) {
        currentValue =
          metric === 'p50_latency_ms'
            ? Number(slo.p50_latency_ms ?? 0)
            : Number(slo.p99_latency_ms ?? 0);
      }
    }

    const compliant = currentValue <= target;
    const errorBudgetPct =
      sampleCount > 0
        ? Math.max(0, Math.round((1 - breachCount / sampleCount) * 1000) / 10)
        : compliant
          ? 100
          : 0;

    results.push({
      id: slo.id,
      name: slo.name,
      transactionId: txId,
      transactionName: slo.transaction_name,
      classification: slo.classification,
      metric,
      targetValue: target,
      currentValue,
      windowHours,
      compliant,
      sampleCount,
      breachCount,
      errorBudgetPct,
      status: compliant ? 'met' : 'breached',
    });
  }

  const met = results.filter((r) => r.compliant).length;
  return {
    totalSlos: results.length,
    met,
    breached: results.length - met,
    compliancePct: results.length ? Math.round((met / results.length) * 100) : 100,
    slos: results,
  };
}

export async function getLatencySeries(tenantId: string, transactionId: string, hours = 24) {
  const rows = await query<{ bucket: string; avg_latency: string; p99: string; count: string }>(
    `SELECT date_trunc('hour', recorded_at)::text as bucket,
      COALESCE(AVG(latency_ms), 0)::text as avg_latency,
      COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms), 0)::text as p99,
      COUNT(*)::text as count
     FROM transaction_samples
     WHERE tenant_id = $1 AND transaction_id = $2
       AND recorded_at > NOW() - ($3 * INTERVAL '1 hour')
     GROUP BY 1
     ORDER BY 1`,
    [tenantId, transactionId, hours],
  );

  return {
    series: rows.map((r) => ({
      time: r.bucket,
      avgLatencyMs: Math.round(Number(r.avg_latency)),
      p99LatencyMs: Math.round(Number(r.p99)),
      count: Number(r.count),
    })),
  };
}
