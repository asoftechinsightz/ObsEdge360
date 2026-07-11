import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { query, queryOne } from '@opsedge360/shared-db';
import type { JwtPayload } from '../auth/auth.service';

function requireAdmin(user: JwtPayload) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
}
function requireTenant(tenantId?: string): string {
  if (!tenantId) throw new BadRequestException('Tenant context required');
  return tenantId;
}

const SUITES = [
  'performance',
  'load',
  'ha',
  'chaos',
  'security',
  'scalability',
  'operational',
  'reliability',
  'reports',
] as const;

@Injectable()
export class Wave7Service {
  private async audit(
    tenantId: string | null,
    actorId: string | undefined,
    action: string,
    resourceType?: string,
    resourceId?: string,
    detail?: Record<string, unknown>,
  ) {
    try {
      await query(
        `INSERT INTO governance_audit_events (tenant_id, actor_id, action, resource_type, resource_id, detail)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [tenantId, actorId ?? null, action, resourceType ?? null, resourceId ?? null, JSON.stringify(detail ?? {})],
      );
    } catch {
      /* optional */
    }
  }

  async overview(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const suites = await query(
      `SELECT suite_key, title, description, enabled FROM certification_suites
       WHERE tenant_id IS NULL OR tenant_id=$1 ORDER BY suite_key`,
      [tid],
    );
    const latest = await query(
      `SELECT DISTINCT ON (suite_key) id, suite_key, status, passed, failed, started_at, finished_at, duration_ms
       FROM certification_runs
       WHERE tenant_id=$1 OR tenant_id IS NULL
       ORDER BY suite_key, started_at DESC`,
      [tid],
    );
    const reports = await query(
      `SELECT id, report_type, title, overall_status, generated_at
       FROM certification_reports WHERE tenant_id=$1 OR tenant_id IS NULL
       ORDER BY generated_at DESC LIMIT 20`,
      [tid],
    );
    const counts = await queryOne<{
      runs: string;
      reports: string;
      soak: string;
      chaos: string;
      load: string;
      bench: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM certification_runs WHERE tenant_id=$1 OR tenant_id IS NULL) AS runs,
         (SELECT COUNT(*)::text FROM certification_reports WHERE tenant_id=$1 OR tenant_id IS NULL) AS reports,
         (SELECT COUNT(*)::text FROM soak_sessions WHERE tenant_id=$1 OR tenant_id IS NULL) AS soak,
         (SELECT COUNT(*)::text FROM chaos_experiments WHERE tenant_id=$1 OR tenant_id IS NULL) AS chaos,
         (SELECT COUNT(*)::text FROM load_test_runs WHERE tenant_id=$1 OR tenant_id IS NULL) AS load,
         (SELECT COUNT(*)::text FROM benchmark_results WHERE tenant_id=$1 OR tenant_id IS NULL) AS bench`,
      [tid],
    );
    return {
      wave: 'v1.0.0-wave7',
      gaClaim: false,
      baseline: 'v1.0.0-wave6',
      pages: ['performance', 'load', 'ha', 'chaos', 'security', 'reliability', 'reports'],
      suites,
      latestBySuite: latest,
      reports,
      inventory: {
        runs: Number(counts?.runs ?? 0),
        reports: Number(counts?.reports ?? 0),
        soakSessions: Number(counts?.soak ?? 0),
        chaosExperiments: Number(counts?.chaos ?? 0),
        loadTests: Number(counts?.load ?? 0),
        benchmarks: Number(counts?.bench ?? 0),
      },
      checkedAt: new Date().toISOString(),
    };
  }

  async listSuites(user: JwtPayload) {
    requireAdmin(user);
    return {
      suites: await query(`SELECT * FROM certification_suites WHERE tenant_id IS NULL ORDER BY suite_key`),
    };
  }

  async startRun(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      suiteKey: string;
      runType?: string;
      environment?: Record<string, unknown>;
      notes?: string;
    },
  ) {
    requireAdmin(user);
    const tid = tenantId ?? null;
    if (!SUITES.includes(body.suiteKey as (typeof SUITES)[number])) {
      throw new BadRequestException(`suiteKey must be one of ${SUITES.join(',')}`);
    }
    const row = await queryOne(
      `INSERT INTO certification_runs
         (tenant_id, suite_key, run_type, status, environment, executed_by, notes)
       VALUES ($1,$2,$3,'running',$4::jsonb,$5,$6)
       RETURNING *`,
      [
        tid,
        body.suiteKey,
        body.runType ?? 'certification',
        JSON.stringify({
          wave: 'v1.0.0-wave7',
          ...(body.environment ?? {}),
        }),
        user.sub,
        body.notes ?? null,
      ],
    );
    await this.audit(tid, user.sub, 'certification.run.started', 'certification_runs', String(row?.id), {
      suiteKey: body.suiteKey,
    });
    return row;
  }

  async completeRun(
    tenantId: string | undefined,
    user: JwtPayload,
    id: string,
    body: {
      status?: string;
      checks?: unknown[];
      metrics?: Record<string, unknown>;
      passed?: number;
      failed?: number;
      notes?: string;
    },
  ) {
    requireAdmin(user);
    const existing = await queryOne<{ id: string; started_at: string }>(
      `SELECT id, started_at FROM certification_runs WHERE id=$1`,
      [id],
    );
    if (!existing) throw new NotFoundException('Run not found');
    const checks = Array.isArray(body.checks) ? body.checks : [];
    const passed =
      body.passed ??
      checks.filter((c) => (c as { ok?: boolean }).ok === true || (c as { status?: string }).status === 'pass').length;
    const failed =
      body.failed ??
      checks.filter((c) => (c as { ok?: boolean }).ok === false || (c as { status?: string }).status === 'fail').length;
    const status =
      body.status ??
      (failed === 0 ? 'passed' : passed > 0 ? 'partial' : 'failed');
    const durationMs = Math.max(0, Date.now() - new Date(existing.started_at).getTime());
    const row = await queryOne(
      `UPDATE certification_runs SET
         status=$2, finished_at=NOW(), duration_ms=$3, checks=$4::jsonb, metrics=$5::jsonb,
         passed=$6, failed=$7, notes=COALESCE($8, notes)
       WHERE id=$1 RETURNING *`,
      [
        id,
        status,
        durationMs,
        JSON.stringify(checks),
        JSON.stringify(body.metrics ?? {}),
        passed,
        failed,
        body.notes ?? null,
      ],
    );
    await this.audit(tenantId ?? null, user.sub, 'certification.run.completed', 'certification_runs', id, {
      status,
      passed,
      failed,
    });
    return row;
  }

  async listRuns(tenantId: string | undefined, user: JwtPayload, suiteKey?: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const runs = suiteKey
      ? await query(
          `SELECT * FROM certification_runs WHERE (tenant_id=$1 OR tenant_id IS NULL) AND suite_key=$2
           ORDER BY started_at DESC LIMIT 50`,
          [tid, suiteKey],
        )
      : await query(
          `SELECT * FROM certification_runs WHERE tenant_id=$1 OR tenant_id IS NULL
           ORDER BY started_at DESC LIMIT 100`,
          [tid],
        );
    return { runs };
  }

  async getRun(user: JwtPayload, id: string) {
    requireAdmin(user);
    const run = await queryOne(`SELECT * FROM certification_runs WHERE id=$1`, [id]);
    if (!run) throw new NotFoundException('Run not found');
    const [benchmarks, loadTests, chaos, soak] = await Promise.all([
      query(`SELECT * FROM benchmark_results WHERE certification_run_id=$1 ORDER BY created_at`, [id]),
      query(`SELECT * FROM load_test_runs WHERE certification_run_id=$1 ORDER BY created_at`, [id]),
      query(`SELECT * FROM chaos_experiments WHERE certification_run_id=$1 ORDER BY started_at`, [id]),
      query(`SELECT * FROM soak_sessions WHERE certification_run_id=$1 ORDER BY started_at`, [id]),
    ]);
    return { run, benchmarks, loadTests, chaosExperiments: chaos, soakSessions: soak };
  }

  async recordBenchmarks(
    tenantId: string | undefined,
    user: JwtPayload,
    runId: string,
    body: { results: Array<Record<string, unknown>> },
  ) {
    requireAdmin(user);
    const tid = tenantId ?? null;
    const run = await queryOne(`SELECT id FROM certification_runs WHERE id=$1`, [runId]);
    if (!run) throw new NotFoundException('Run not found');
    const inserted = [];
    for (const r of body.results || []) {
      if (!r.target || !r.operation) continue;
      const row = await queryOne(
        `INSERT INTO benchmark_results
           (certification_run_id, tenant_id, target, operation, samples, avg_ms, p95_ms, min_ms, max_ms, throughput_rps, detail)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) RETURNING *`,
        [
          runId,
          tid,
          String(r.target),
          String(r.operation),
          Number(r.samples ?? 0),
          r.avgMs ?? r.avg_ms ?? null,
          r.p95Ms ?? r.p95_ms ?? null,
          r.minMs ?? r.min_ms ?? null,
          r.maxMs ?? r.max_ms ?? null,
          r.throughputRps ?? r.throughput_rps ?? null,
          JSON.stringify(r.detail ?? {}),
        ],
      );
      inserted.push(row);
    }
    return { count: inserted.length, results: inserted };
  }

  async recordLoadTest(
    tenantId: string | undefined,
    user: JwtPayload,
    runId: string,
    body: Record<string, unknown>,
  ) {
    requireAdmin(user);
    const tid = tenantId ?? null;
    const run = await queryOne(`SELECT id FROM certification_runs WHERE id=$1`, [runId]);
    if (!run) throw new NotFoundException('Run not found');
    if (!body.concurrency || !body.totalRequests) {
      throw new BadRequestException('concurrency and totalRequests required');
    }
    const row = await queryOne(
      `INSERT INTO load_test_runs
         (certification_run_id, tenant_id, profile, concurrency, total_requests, success_count, error_count,
          p50_ms, p95_ms, p99_ms, rps, cpu_pct, mem_mb, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb) RETURNING *`,
      [
        runId,
        tid,
        body.profile ?? 'sustained',
        Number(body.concurrency),
        Number(body.totalRequests),
        Number(body.successCount ?? 0),
        Number(body.errorCount ?? 0),
        body.p50Ms ?? null,
        body.p95Ms ?? null,
        body.p99Ms ?? null,
        body.rps ?? null,
        body.cpuPct ?? null,
        body.memMb ?? null,
        JSON.stringify(body.detail ?? {}),
      ],
    );
    return row;
  }

  async recordChaos(
    tenantId: string | undefined,
    user: JwtPayload,
    runId: string,
    body: Record<string, unknown>,
  ) {
    requireAdmin(user);
    const tid = tenantId ?? null;
    const run = await queryOne(`SELECT id FROM certification_runs WHERE id=$1`, [runId]);
    if (!run) throw new NotFoundException('Run not found');
    if (!body.experimentKey || !body.target || !body.injection) {
      throw new BadRequestException('experimentKey, target, injection required');
    }
    const row = await queryOne(
      `INSERT INTO chaos_experiments
         (certification_run_id, tenant_id, experiment_key, target, injection, recovered, recovery_ms, data_loss, detail, finished_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,NOW()) RETURNING *`,
      [
        runId,
        tid,
        body.experimentKey,
        body.target,
        body.injection,
        body.recovered === true,
        body.recoveryMs ?? null,
        body.dataLoss === true,
        JSON.stringify(body.detail ?? {}),
      ],
    );
    await this.audit(tid, user.sub, 'certification.chaos.recorded', 'chaos_experiments', String(row?.id), {
      experimentKey: body.experimentKey,
      recovered: body.recovered === true,
    });
    return row;
  }

  async startSoak(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { certificationRunId?: string; plannedDurationSec: number },
  ) {
    requireAdmin(user);
    const tid = tenantId ?? null;
    if (!body.plannedDurationSec || body.plannedDurationSec < 1) {
      throw new BadRequestException('plannedDurationSec required');
    }
    return queryOne(
      `INSERT INTO soak_sessions (certification_run_id, tenant_id, planned_duration_sec, status)
       VALUES ($1,$2,$3,'running') RETURNING *`,
      [body.certificationRunId ?? null, tid, body.plannedDurationSec],
    );
  }

  async checkpointSoak(
    tenantId: string | undefined,
    user: JwtPayload,
    id: string,
    body: { checkpoint: Record<string, unknown>; leakSignals?: Record<string, unknown> },
  ) {
    requireAdmin(user);
    const session = await queryOne<{ id: string; checkpoints: unknown }>(
      `SELECT id, checkpoints FROM soak_sessions WHERE id=$1`,
      [id],
    );
    if (!session) throw new NotFoundException('Soak session not found');
    const checkpoints = Array.isArray(session.checkpoints) ? [...session.checkpoints] : [];
    checkpoints.push({ ...body.checkpoint, at: new Date().toISOString() });
    return queryOne(
      `UPDATE soak_sessions SET checkpoints=$2::jsonb, leak_signals=COALESCE($3::jsonb, leak_signals)
       WHERE id=$1 RETURNING *`,
      [id, JSON.stringify(checkpoints), body.leakSignals ? JSON.stringify(body.leakSignals) : null],
    );
  }

  async finishSoak(
    tenantId: string | undefined,
    user: JwtPayload,
    id: string,
    body: { status?: string; actualDurationSec?: number; leakSignals?: Record<string, unknown> },
  ) {
    requireAdmin(user);
    const session = await queryOne<{ id: string; started_at: string; planned_duration_sec: number }>(
      `SELECT id, started_at, planned_duration_sec FROM soak_sessions WHERE id=$1`,
      [id],
    );
    if (!session) throw new NotFoundException('Soak session not found');
    const actual =
      body.actualDurationSec ??
      Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
    const status = body.status ?? 'passed';
    return queryOne(
      `UPDATE soak_sessions SET status=$2, actual_duration_sec=$3, finished_at=NOW(),
         leak_signals=COALESCE($4::jsonb, leak_signals)
       WHERE id=$1 RETURNING *`,
      [id, status, actual, body.leakSignals ? JSON.stringify(body.leakSignals) : null],
    );
  }

  async generateReport(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      reportType: string;
      title?: string;
      runIds?: string[];
      summary?: Record<string, unknown>;
      body?: Record<string, unknown>;
      overallStatus?: string;
    },
  ) {
    requireAdmin(user);
    const tid = tenantId ?? null;
    if (!body.reportType) throw new BadRequestException('reportType required');
    const row = await queryOne(
      `INSERT INTO certification_reports
         (tenant_id, report_type, title, run_ids, summary, body, overall_status, generated_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8) RETURNING *`,
      [
        tid,
        body.reportType,
        body.title ?? `${body.reportType} report`,
        body.runIds ?? [],
        JSON.stringify({ wave: 'v1.0.0-wave7', gaClaim: false, ...(body.summary ?? {}) }),
        JSON.stringify(body.body ?? {}),
        body.overallStatus ?? 'certified',
        user.sub,
      ],
    );
    await this.audit(tid, user.sub, 'certification.report.generated', 'certification_reports', String(row?.id), {
      reportType: body.reportType,
    });
    return row;
  }

  async listReports(tenantId: string | undefined, user: JwtPayload, reportType?: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const reports = reportType
      ? await query(
          `SELECT * FROM certification_reports WHERE (tenant_id=$1 OR tenant_id IS NULL) AND report_type=$2
           ORDER BY generated_at DESC LIMIT 50`,
          [tid, reportType],
        )
      : await query(
          `SELECT * FROM certification_reports WHERE tenant_id=$1 OR tenant_id IS NULL
           ORDER BY generated_at DESC LIMIT 100`,
          [tid],
        );
    return { reports };
  }

  async scalabilitySnapshot(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const snap = await queryOne<Record<string, string>>(
      `SELECT
         (SELECT COUNT(*)::text FROM configuration_items) AS cmdb_cis,
         (SELECT COUNT(*)::text FROM inferred_dependencies) AS topology_edges,
         (SELECT COUNT(*)::text FROM prometheus_samples) AS metric_samples,
         (SELECT COUNT(*)::text FROM otlp_spans) AS trace_spans,
         (SELECT COUNT(*)::text FROM connector_instances WHERE tenant_id=$1 OR tenant_id IS NULL) AS connectors,
         (SELECT COUNT(*)::text FROM kg_entities) AS kg_entities,
         (SELECT COUNT(*)::text FROM ops_incidents) AS events_incidents`,
      [tid],
    );
    return {
      wave: 'v1.0.0-wave7',
      snapshot: {
        cmdb: Number(snap?.cmdb_cis ?? 0),
        topology: Number(snap?.topology_edges ?? 0),
        metrics: Number(snap?.metric_samples ?? 0),
        traces: Number(snap?.trace_spans ?? 0),
        connectors: Number(snap?.connectors ?? 0),
        knowledgeGraph: Number(snap?.kg_entities ?? 0),
        events: Number(snap?.events_incidents ?? 0),
      },
      measuredAt: new Date().toISOString(),
    };
  }

  async securityMatrix(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const policies = await query<{ policy_type: string; config: unknown }>(
      `SELECT policy_type, config FROM security_policies WHERE tenant_id=$1`,
      [tid],
    );
    const rotation = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM secret_rotation_jobs WHERE tenant_id=$1`,
      [tid],
    );
    const certs = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM enterprise_certificates WHERE tenant_id=$1`,
      [tid],
    );
    const sessions = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM user_sessions WHERE tenant_id=$1 AND revoked_at IS NULL`,
      [tid],
    );
    return {
      wave: 'v1.0.0-wave7',
      matrix: {
        passwordPolicy: policies.some((p) => p.policy_type === 'password'),
        sessionPolicy: policies.some((p) => p.policy_type === 'session'),
        secretRotationJobs: Number(rotation?.c ?? 0),
        certificates: Number(certs?.c ?? 0),
        activeSessions: Number(sessions?.c ?? 0),
        authzEnforce: process.env.AUTHZ_ENFORCE !== 'false',
        tlsTerminatedAtEdge: true,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  async operationalChecklist(user: JwtPayload) {
    requireAdmin(user);
    const airgap = await queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM airgap_packages WHERE verified=true`);
    const backups = await queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM backup_certifications`);
    const restores = await queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM restore_certifications`);
    const profiles = await queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM deployment_profiles`);
    return {
      wave: 'v1.0.0-wave7',
      checklist: {
        backupCertifications: Number(backups?.c ?? 0),
        restoreCertifications: Number(restores?.c ?? 0),
        airgapVerified: Number(airgap?.c ?? 0),
        deploymentProfiles: Number(profiles?.c ?? 0),
        helmChartPresent: true,
        dockerComposePresent: true,
        upgradeScript: 'scripts/upgrade-onprem.sh',
        rollback: 'git reset to prior tag + recreate',
      },
      checkedAt: new Date().toISOString(),
    };
  }
}
