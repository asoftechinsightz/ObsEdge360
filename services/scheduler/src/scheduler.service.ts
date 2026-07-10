import { query, queryOne } from '@opsedge360/shared-db';

export interface SchedulerJob {
  id: string;
  tenant_id: string;
  name: string;
  job_type: string;
  cron_expression: string | null;
  payload: Record<string, unknown>;
  status: string;
  retry_policy: { maxAttempts: number; backoffMs: number };
  next_run_at: string | null;
  last_run_at: string | null;
}

export interface JobRun {
  id: string;
  job_id: string;
  status: string;
  attempt: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  result: Record<string, unknown>;
}

function computeNextRun(cron: string | null): Date | null {
  if (!cron) return new Date(Date.now() + 60_000);
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return new Date(Date.now() + 300_000);
  const minute = parts[0] === '*' ? new Date().getMinutes() + 1 : Number(parts[0]);
  const next = new Date();
  next.setMinutes(minute % 60, 0, 0);
  if (next <= new Date()) next.setHours(next.getHours() + 1);
  return next;
}

export async function listJobs(tenantId: string): Promise<SchedulerJob[]> {
  return query<SchedulerJob>(
    'SELECT * FROM scheduler_jobs WHERE tenant_id = $1 ORDER BY name',
    [tenantId],
  );
}

export async function createJob(
  tenantId: string,
  data: {
    name: string;
    jobType: string;
    cronExpression?: string;
    payload?: Record<string, unknown>;
    retryPolicy?: { maxAttempts: number; backoffMs: number };
  },
): Promise<SchedulerJob> {
  const nextRun = computeNextRun(data.cronExpression ?? null);
  const row = await queryOne<SchedulerJob>(
    `INSERT INTO scheduler_jobs
      (tenant_id, name, job_type, cron_expression, payload, retry_policy, next_run_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      tenantId,
      data.name,
      data.jobType,
      data.cronExpression ?? null,
      JSON.stringify(data.payload ?? {}),
      JSON.stringify(data.retryPolicy ?? { maxAttempts: 3, backoffMs: 5000 }),
      nextRun?.toISOString() ?? null,
    ],
  );
  if (!row) throw new Error('Failed to create job');
  return row;
}

export async function getDueJobs(): Promise<SchedulerJob[]> {
  return query<SchedulerJob>(
    `SELECT * FROM scheduler_jobs
     WHERE status = 'active' AND next_run_at IS NOT NULL AND next_run_at <= NOW()
     ORDER BY next_run_at ASC
     LIMIT 50`,
  );
}

export async function startRun(jobId: string, attempt: number): Promise<JobRun> {
  const row = await queryOne<JobRun>(
    `INSERT INTO scheduler_job_runs (job_id, status, attempt)
     VALUES ($1, 'running', $2)
     RETURNING *`,
    [jobId, attempt],
  );
  if (!row) throw new Error('Failed to start job run');
  return row;
}

export async function completeRun(
  runId: string,
  status: 'completed' | 'failed',
  result: Record<string, unknown>,
  errorMessage?: string,
): Promise<void> {
  await query(
    `UPDATE scheduler_job_runs
     SET status = $2, completed_at = NOW(), result = $3, error_message = $4
     WHERE id = $1`,
    [runId, status, JSON.stringify(result), errorMessage ?? null],
  );
}

export async function scheduleNextRun(job: SchedulerJob): Promise<void> {
  const next = computeNextRun(job.cron_expression);
  await query(
    'UPDATE scheduler_jobs SET last_run_at = NOW(), next_run_at = $2 WHERE id = $1',
    [job.id, next?.toISOString() ?? null],
  );
}

export async function moveToDeadLetter(
  jobId: string,
  payload: Record<string, unknown>,
  errorMessage: string,
  attempts: number,
): Promise<void> {
  await query(
    `INSERT INTO scheduler_dead_letter (job_id, payload, error_message, attempts)
     VALUES ($1, $2, $3, $4)`,
    [jobId, JSON.stringify(payload), errorMessage, attempts],
  );
}

export async function listDeadLetter(tenantId: string): Promise<unknown[]> {
  return query(
    `SELECT d.*, j.name AS job_name
     FROM scheduler_dead_letter d
     JOIN scheduler_jobs j ON j.id = d.job_id
     WHERE j.tenant_id = $1
     ORDER BY d.created_at DESC
     LIMIT 100`,
    [tenantId],
  );
}

export async function executeJob(job: SchedulerJob): Promise<Record<string, unknown>> {
  switch (job.job_type) {
    case 'discovery.scan':
      return { dispatched: true, connectorId: job.payload.connectorId };
    case 'cmdb.drift-check':
      return { checked: true };
    case 'telemetry.rollup':
      return { rolledUp: true };
    default:
      return { executed: true, jobType: job.job_type };
  }
}
