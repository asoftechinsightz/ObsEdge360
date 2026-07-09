import { query, queryOne } from '@opsedge360/shared-db';
import type { QuantumJob, QuantumReadiness } from '@opsedge360/shared-types';

interface JobRow {
  id: string;
  external_job_id: string | null;
  provider: string;
  job_type: string;
  algorithm: string | null;
  qubits_used: number | null;
  circuit_depth: number | null;
  status: string;
  classical_runtime_ms: number | null;
  quantum_runtime_ms: number | null;
  result_summary: Record<string, unknown>;
  submitted_at: string;
  completed_at: string | null;
}

interface ReadinessRow {
  id: string;
  assessment_type: string;
  score: number;
  pqc_algorithms_adopted: string[] | null;
  tls_pqc_ready: boolean;
  key_rotation_days: number | null;
  findings: Array<Record<string, unknown>>;
  recommendations: Array<Record<string, unknown>>;
  assessed_at: string;
}

function mapJob(r: JobRow): QuantumJob {
  return {
    id: r.id,
    externalJobId: r.external_job_id ?? undefined,
    provider: r.provider,
    jobType: r.job_type,
    algorithm: r.algorithm ?? undefined,
    qubitsUsed: r.qubits_used ?? undefined,
    circuitDepth: r.circuit_depth ?? undefined,
    status: r.status,
    classicalRuntimeMs: r.classical_runtime_ms ?? undefined,
    quantumRuntimeMs: r.quantum_runtime_ms ?? undefined,
    resultSummary: r.result_summary,
    submittedAt: r.submitted_at,
    completedAt: r.completed_at ?? undefined,
  };
}

function mapReadiness(r: ReadinessRow): QuantumReadiness {
  return {
    id: r.id,
    assessmentType: r.assessment_type,
    score: r.score,
    pqcAlgorithmsAdopted: r.pqc_algorithms_adopted ?? [],
    tlsPqcReady: r.tls_pqc_ready,
    keyRotationDays: r.key_rotation_days ?? undefined,
    findings: r.findings,
    recommendations: r.recommendations,
    assessedAt: r.assessed_at,
  };
}

export async function listJobs(tenantId: string, status?: string): Promise<QuantumJob[]> {
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  if (status) {
    conditions.push('status = $2');
    params.push(status);
  }
  const rows = await query<JobRow>(
    `SELECT * FROM quantum_jobs WHERE ${conditions.join(' AND ')} ORDER BY submitted_at DESC LIMIT 50`,
    params,
  );
  return rows.map(mapJob);
}

export async function submitJob(tenantId: string, body: {
  provider: string;
  jobType: string;
  algorithm?: string;
  qubitsUsed?: number;
  circuitDepth?: number;
  externalJobId?: string;
}) {
  const row = await queryOne<JobRow>(
    `INSERT INTO quantum_jobs (tenant_id, external_job_id, provider, job_type, algorithm, qubits_used, circuit_depth, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued') RETURNING *`,
    [tenantId, body.externalJobId ?? null, body.provider, body.jobType, body.algorithm ?? null, body.qubitsUsed ?? null, body.circuitDepth ?? null],
  );
  if (!row) throw new Error('Failed to submit quantum job');
  return mapJob(row);
}

export async function getLatestReadiness(tenantId: string): Promise<QuantumReadiness | null> {
  const row = await queryOne<ReadinessRow>(
    `SELECT * FROM quantum_readiness WHERE tenant_id = $1 ORDER BY assessed_at DESC LIMIT 1`,
    [tenantId],
  );
  return row ? mapReadiness(row) : null;
}

export async function assessPqcReadiness(tenantId: string) {
  const cis = await query<{ ci_type: string; attributes: Record<string, unknown> }>(
    `SELECT ci_type, attributes FROM configuration_items WHERE tenant_id = $1`,
    [tenantId],
  );

  const total = cis.length || 1;
  const encrypted = cis.filter((c) => c.attributes?.encryption_at_rest === true).length;
  const tlsModern = cis.filter((c) => ['api', 'service', 'load_balancer'].includes(c.ci_type)).length;

  const score = Math.min(95, Math.round((encrypted / total) * 40 + (tlsModern / total) * 30 + 28));
  const findings = [
    { area: 'encryption_at_rest', status: encrypted / total > 0.8 ? 'good' : 'partial', detail: `${encrypted}/${total} CIs with encryption at rest` },
    { area: 'tls_endpoints', status: 'partial', detail: `${tlsModern} TLS-terminated endpoints inventoried` },
    { area: 'algorithm_inventory', status: 'planned', detail: 'Post-quantum algorithm migration roadmap in progress' },
  ];
  const recommendations = [
    { priority: 'high', action: 'Migrate API gateway to hybrid ML-KEM TLS' },
    { priority: 'medium', action: 'Tag quantum-vulnerable crypto in CMDB attributes' },
    { priority: 'low', action: 'Pilot QAOA optimization for portfolio risk workloads' },
  ];

  const row = await queryOne<ReadinessRow>(
    `INSERT INTO quantum_readiness (tenant_id, assessment_type, score, pqc_algorithms_adopted, tls_pqc_ready, key_rotation_days, findings, recommendations)
     VALUES ($1, 'pqc_migration', $2, $3, $4, 90, $5, $6) RETURNING *`,
    [tenantId, score, ['ML-KEM-768', 'ML-DSA-65'], score >= 75, JSON.stringify(findings), JSON.stringify(recommendations)],
  );
  if (!row) throw new Error('Assessment failed');
  return mapReadiness(row);
}

export async function getQuantumSummary(tenantId: string) {
  const jobs = await listJobs(tenantId);
  const readiness = await getLatestReadiness(tenantId);
  return {
    activeJobs: jobs.filter((j) => ['queued', 'running'].includes(j.status)).length,
    completedJobs: jobs.filter((j) => j.status === 'completed').length,
    pqcReadinessScore: readiness?.score ?? 0,
    tlsPqcReady: readiness?.tlsPqcReady ?? false,
    providers: [...new Set(jobs.map((j) => j.provider))],
  };
}
