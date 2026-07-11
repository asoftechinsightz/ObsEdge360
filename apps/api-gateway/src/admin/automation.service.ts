import { createHash } from 'crypto';
import {
  assertAutoExecuteNotProduction,
  inMaintenanceWindow,
  signWorkflowDefinition,
} from './automation.helpers';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
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

type WorkflowStep = {
  key: string;
  action: string;
  type?: 'sequential' | 'parallel' | 'branch' | 'compensate';
  condition?: string;
  parallel?: WorkflowStep[];
  branches?: Array<{ when: string; steps: WorkflowStep[] }>;
  timeoutMs?: number;
  retries?: number;
  compensate?: string;
  readOnly?: boolean;
};

type WorkflowDefinition = {
  steps: WorkflowStep[];
  timeoutMs?: number;
};

const CONTROL_MODES = [
  'manual_only',
  'approval_required',
  'maintenance_window',
  'auto_execute',
  'read_only',
] as const;

@Injectable()
export class AutomationService {
  private async history(
    tenantId: string,
    actorId: string | undefined,
    eventType: string,
    resourceType?: string,
    resourceId?: string,
    detail?: Record<string, unknown>,
  ) {
    const payload = JSON.stringify({
      tenantId,
      eventType,
      resourceType,
      resourceId,
      actorId,
      detail: detail ?? {},
      at: new Date().toISOString(),
    });
    const immutableHash = createHash('sha256').update(payload).digest('hex');
    await query(
      `INSERT INTO automation_history_events
         (tenant_id, event_type, resource_type, resource_id, actor_id, detail, immutable_hash)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        tenantId,
        eventType,
        resourceType ?? null,
        resourceId ?? null,
        actorId ?? null,
        JSON.stringify(detail ?? {}),
        immutableHash,
      ],
    );
    // Dual-write governance audit when available
    try {
      await query(
        `INSERT INTO governance_audit_events (tenant_id, actor_id, action, resource_type, resource_id, detail)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          tenantId,
          actorId ?? null,
          `automation.${eventType}`,
          resourceType ?? null,
          resourceId ?? null,
          JSON.stringify(detail ?? {}),
        ],
      );
    } catch {
      /* governance table may be absent in partial envs */
    }
  }

  private async ensureControlPlane(tenantId: string) {
    await query(
      `INSERT INTO automation_control_plane (tenant_id) VALUES ($1)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId],
    );
    const rb = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM runbook_definitions WHERE tenant_id = $1`,
      [tenantId],
    );
    if (Number(rb?.c ?? 0) === 0) {
      const catalog: Array<[string, string, string, string]> = [
        ['Restart service', 'Controlled restart of a named service', '[{"key":"validate","action":"validate_target"},{"key":"restart","action":"restart_service","compensate":"verify_health"},{"key":"verify","action":"verify_health"}]', 'restart_service'],
        ['Restart pod', 'Restart workload pod/replica set', '[{"key":"validate","action":"validate_target"},{"key":"restart","action":"restart_pod","compensate":"scale_check"},{"key":"verify","action":"verify_health"}]', 'restart_pod'],
        ['Scale deployment', 'Scale replicas up/down within policy bounds', '[{"key":"validate","action":"validate_target"},{"key":"scale","action":"scale_replicas","compensate":"scale_revert"},{"key":"verify","action":"verify_health"}]', 'scale_replicas'],
        ['Clear cache', 'Flush application/cache tier safely', '[{"key":"validate","action":"validate_target"},{"key":"clear","action":"clear_cache","compensate":"warm_cache"}]', 'clear_cache'],
        ['Rotate certificate', 'Certificate rotation with validation', '[{"key":"validate","action":"validate_cert"},{"key":"rotate","action":"rotate_certificate","compensate":"rollback_cert"},{"key":"verify","action":"verify_tls"}]', 'rotate_certificate'],
        ['Rotate secrets', 'Secret rotation via secrets store metadata', '[{"key":"validate","action":"validate_secret"},{"key":"rotate","action":"rotate_secrets","compensate":"rollback_secret"}]', 'rotate_secrets'],
        ['Restart application', 'Application process/service restart', '[{"key":"validate","action":"validate_target"},{"key":"restart","action":"restart_application","compensate":"verify_health"}]', 'restart_application'],
        ['Database connection reset', 'Reset pooled DB connections', '[{"key":"validate","action":"validate_target"},{"key":"reset","action":"rotate_connection_pool","compensate":"verify_db"}]', 'rotate_connection_pool'],
        ['Queue cleanup', 'Drain/cleanup stale queue messages (dry-run first)', '[{"key":"validate","action":"validate_queue"},{"key":"cleanup","action":"queue_cleanup","compensate":"requeue_preview"}]', 'queue_cleanup'],
        ['Log collection', 'Collect diagnostic logs for incident', '[{"key":"validate","action":"validate_target"},{"key":"collect","action":"collect_logs"}]', 'collect_logs'],
      ];
      for (const [name, description, steps, code] of catalog) {
        await query(
          `INSERT INTO runbook_definitions (tenant_id, name, description, steps, linked_action_code, version, status)
           VALUES ($1, $2, $3, $4::jsonb, $5, 1, 'active')`,
          [tenantId, name, description, steps, code],
        );
      }
    }
  }

  async getDashboard(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    await this.ensureControlPlane(tid);
    const control = await queryOne<{ emergency_stop: boolean; paused: boolean; reason: string | null }>(
      `SELECT emergency_stop, paused, reason FROM automation_control_plane WHERE tenant_id = $1`,
      [tid],
    );
    const counts = await queryOne<{
      workflows: string;
      running: string;
      awaiting: string;
      simulations: string;
      approvals: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM automation_workflows WHERE tenant_id = $1) AS workflows,
         (SELECT COUNT(*)::text FROM automation_executions WHERE tenant_id = $1 AND status IN ('running','queued')) AS running,
         (SELECT COUNT(*)::text FROM automation_approvals WHERE tenant_id = $1 AND status = 'pending') AS awaiting,
         (SELECT COUNT(*)::text FROM automation_simulations WHERE tenant_id = $1) AS simulations,
         (SELECT COUNT(*)::text FROM automation_approvals WHERE tenant_id = $1) AS approvals`,
      [tid],
    );
    return {
      wave: 'v1.0.0-wave4',
      gaClaim: false,
      autonomousProduction: false,
      control: {
        emergencyStop: !!control?.emergency_stop,
        paused: !!control?.paused,
        reason: control?.reason ?? null,
      },
      counts: {
        workflows: Number(counts?.workflows ?? 0),
        activeOrQueued: Number(counts?.running ?? 0),
        pendingApprovals: Number(counts?.awaiting ?? 0),
        simulations: Number(counts?.simulations ?? 0),
        approvalsTotal: Number(counts?.approvals ?? 0),
      },
      metricsHints: {
        prometheus: [
          'opsedge_automation_executions_total',
          'opsedge_automation_approvals_pending',
          'opsedge_automation_emergency_stop',
          'opsedge_automation_simulation_total',
        ],
      },
      checkedAt: new Date().toISOString(),
    };
  }

  async listWorkflows(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const workflows = await query(
      `SELECT id, tenant_id, name, description, definition, version, signature_hash, status,
              runbook_id, policy_id, created_by, created_at, updated_at
       FROM automation_workflows WHERE tenant_id = $1 ORDER BY updated_at DESC`,
      [tid],
    );
    return { workflows };
  }

  async createWorkflow(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      name: string;
      description?: string;
      definition?: WorkflowDefinition;
      runbookId?: string;
      policyId?: string;
      status?: string;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.name) throw new BadRequestException('name required');
    const definition: WorkflowDefinition = body.definition ?? { steps: [] };
    if (!Array.isArray(definition.steps)) throw new BadRequestException('definition.steps must be an array');
    const signatureHash = signWorkflowDefinition(definition);
    const status = body.status ?? 'draft';
    if (!['draft', 'active', 'archived'].includes(status)) throw new BadRequestException('invalid status');
    const row = await queryOne(
      `INSERT INTO automation_workflows
         (tenant_id, name, description, definition, signature_hash, status, runbook_id, policy_id, created_by)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        tid,
        body.name,
        body.description ?? null,
        JSON.stringify(definition),
        signatureHash,
        status,
        body.runbookId ?? null,
        body.policyId ?? null,
        user.sub,
      ],
    );
    await this.history(tid, user.sub, 'workflow.created', 'workflow', String(row?.id), { name: body.name });
    return row;
  }

  async getWorkflow(tenantId: string | undefined, user: JwtPayload, id: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const row = await queryOne(`SELECT * FROM automation_workflows WHERE id = $1 AND tenant_id = $2`, [id, tid]);
    if (!row) throw new NotFoundException('Workflow not found');
    return row;
  }

  async listPolicies(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const policies = await query(
      `SELECT * FROM automation_policies WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tid],
    );
    return { policies };
  }

  async createPolicy(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      name: string;
      policyType?: string;
      executionMode?: string;
      controlMode?: string;
      requireApproval?: boolean;
      emergencyStop?: boolean;
      safetyRules?: Record<string, unknown>;
      environmentScope?: string;
      maintenanceWindows?: unknown[];
      maxApprovalLevels?: number;
      approvalTtlMinutes?: number;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.name) throw new BadRequestException('name required');
    const mode = body.executionMode ?? 'dry_run';
    if (!['dry_run', 'simulation', 'production'].includes(mode)) {
      throw new BadRequestException('invalid executionMode');
    }
    const controlMode = body.controlMode ?? 'approval_required';
    if (!CONTROL_MODES.includes(controlMode as (typeof CONTROL_MODES)[number])) {
      throw new BadRequestException('invalid controlMode');
    }
    const requireApproval = body.requireApproval ?? controlMode !== 'auto_execute';
    if (mode === 'production' && !requireApproval) {
      throw new BadRequestException('production executionMode requires requireApproval=true');
    }
    const autoProdErr = assertAutoExecuteNotProduction(controlMode, mode);
    if (autoProdErr) throw new BadRequestException(autoProdErr);
    const row = await queryOne(
      `INSERT INTO automation_policies
         (tenant_id, name, policy_type, execution_mode, require_approval, emergency_stop, safety_rules,
          control_mode, environment_scope, maintenance_windows, max_approval_levels, approval_ttl_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, $11, $12)
       RETURNING *`,
      [
        tid,
        body.name,
        body.policyType ?? 'remediation',
        mode,
        requireApproval,
        body.emergencyStop ?? false,
        JSON.stringify(body.safetyRules ?? {}),
        controlMode,
        body.environmentScope ?? 'all',
        JSON.stringify(body.maintenanceWindows ?? []),
        body.maxApprovalLevels ?? 1,
        body.approvalTtlMinutes ?? 240,
      ],
    );
    await this.history(tid, user.sub, 'policy.created', 'policy', String(row?.id), {
      name: body.name,
      controlMode,
      mode,
    });
    return row;
  }

  async listRunbooks(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    await this.ensureControlPlane(tid);
    const runbooks = await query(
      `SELECT * FROM runbook_definitions WHERE tenant_id = $1 ORDER BY name ASC, version DESC`,
      [tid],
    );
    return { runbooks };
  }

  async createRunbook(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      name: string;
      description?: string;
      steps?: unknown[];
      linkedActionCode?: string;
      status?: string;
      version?: number;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.name) throw new BadRequestException('name required');
    const row = await queryOne(
      `INSERT INTO runbook_definitions (tenant_id, name, description, steps, linked_action_code, version, status)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
       RETURNING *`,
      [
        tid,
        body.name,
        body.description ?? null,
        JSON.stringify(body.steps ?? []),
        body.linkedActionCode ?? null,
        body.version ?? 1,
        body.status ?? 'draft',
      ],
    );
    await this.history(tid, user.sub, 'runbook.created', 'runbook', String(row?.id), { name: body.name });
    return row;
  }

  async getEmergencyStop(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    await this.ensureControlPlane(tid);
    const control = await queryOne(
      `SELECT emergency_stop, paused, reason, updated_by, updated_at FROM automation_control_plane WHERE tenant_id = $1`,
      [tid],
    );
    const active = await query(
      `SELECT id, workflow_id, mode, status, current_step, started_at, updated_at
       FROM automation_executions
       WHERE tenant_id = $1 AND status IN ('queued','awaiting_approval','running','paused','compensating')
       ORDER BY started_at DESC LIMIT 100`,
      [tid],
    );
    return { control, activeExecutions: active, wave: 'v1.0.0-wave4', gaClaim: false };
  }

  async setEmergencyStop(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { emergencyStop: boolean; reason?: string; pause?: boolean },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    await this.ensureControlPlane(tid);
    const row = await queryOne(
      `UPDATE automation_control_plane
       SET emergency_stop = $2,
           paused = COALESCE($3, paused),
           reason = $4,
           updated_by = $5,
           updated_at = NOW()
       WHERE tenant_id = $1
       RETURNING *`,
      [tid, !!body.emergencyStop, body.pause ?? null, body.reason ?? null, user.sub],
    );
    // Mirror onto policies for Wave 1 UI compatibility
    await query(
      `UPDATE automation_policies SET emergency_stop = $2, updated_at = NOW() WHERE tenant_id = $1`,
      [tid, !!body.emergencyStop],
    );
    if (body.emergencyStop) {
      await query(
        `UPDATE automation_executions SET status = 'paused', updated_at = NOW()
         WHERE tenant_id = $1 AND status IN ('queued','running')`,
        [tid],
      );
    }
    await this.history(tid, user.sub, body.emergencyStop ? 'emergency_stop.enabled' : 'emergency_stop.cleared', 'control_plane', tid, {
      reason: body.reason,
      pause: body.pause,
    });
    return row;
  }

  async pauseAll(tenantId: string | undefined, user: JwtPayload, reason?: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    await this.ensureControlPlane(tid);
    await query(
      `UPDATE automation_control_plane SET paused = TRUE, reason = $2, updated_by = $3, updated_at = NOW() WHERE tenant_id = $1`,
      [tid, reason ?? 'paused by operator', user.sub],
    );
    await query(
      `UPDATE automation_executions SET status = 'paused', updated_at = NOW()
       WHERE tenant_id = $1 AND status IN ('queued','running')`,
      [tid],
    );
    await this.history(tid, user.sub, 'workflows.paused', 'control_plane', tid, { reason });
    return this.getEmergencyStop(tid, user);
  }

  async resumeAll(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    await this.ensureControlPlane(tid);
    const control = await queryOne<{ emergency_stop: boolean }>(
      `SELECT emergency_stop FROM automation_control_plane WHERE tenant_id = $1`,
      [tid],
    );
    if (control?.emergency_stop) {
      throw new ConflictException('Clear emergency stop before resuming workflows');
    }
    await query(
      `UPDATE automation_control_plane SET paused = FALSE, reason = NULL, updated_by = $2, updated_at = NOW() WHERE tenant_id = $1`,
      [tid, user.sub],
    );
    await query(
      `UPDATE automation_executions SET status = 'queued', updated_at = NOW()
       WHERE tenant_id = $1 AND status = 'paused'`,
      [tid],
    );
    await this.history(tid, user.sub, 'workflows.resumed', 'control_plane', tid, {});
    return this.getEmergencyStop(tid, user);
  }

  async cancelQueued(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const result = await query<{ id: string }>(
      `UPDATE automation_executions SET status = 'cancelled', completed_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND status IN ('queued','awaiting_approval','paused')
       RETURNING id`,
      [tid],
    );
    await this.history(tid, user.sub, 'workflows.cancel_queued', 'control_plane', tid, {
      cancelled: result.length,
    });
    return { cancelled: result.length, ids: result.map((r) => r.id) };
  }

  private async assertCanStart(tid: string) {
    await this.ensureControlPlane(tid);
    const control = await queryOne<{ emergency_stop: boolean; paused: boolean }>(
      `SELECT emergency_stop, paused FROM automation_control_plane WHERE tenant_id = $1`,
      [tid],
    );
    if (control?.emergency_stop) {
      throw new ServiceUnavailableException('Emergency stop is active — new workflow execution blocked');
    }
    if (control?.paused) {
      throw new ServiceUnavailableException('Automation is paused — clear pause to start workflows');
    }
  }

  async startExecution(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { workflowId: string; mode?: 'simulation' | 'dry_run' | 'live'; context?: Record<string, unknown> },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    await this.assertCanStart(tid);
    if (!body.workflowId) throw new BadRequestException('workflowId required');
    const mode = body.mode ?? 'simulation';
    if (!['simulation', 'dry_run', 'live'].includes(mode)) throw new BadRequestException('invalid mode');

    const workflow = await queryOne<{
      id: string;
      definition: WorkflowDefinition;
      policy_id: string | null;
      status: string;
      signature_hash: string;
    }>(`SELECT * FROM automation_workflows WHERE id = $1 AND tenant_id = $2`, [body.workflowId, tid]);
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (workflow.status !== 'active' && workflow.status !== 'draft') {
      throw new BadRequestException('Workflow is not startable');
    }

    let policy: Record<string, unknown> | null = null;
    if (workflow.policy_id) {
      policy = await queryOne(`SELECT * FROM automation_policies WHERE id = $1 AND tenant_id = $2`, [
        workflow.policy_id,
        tid,
      ]);
    }
    if (!policy) {
      policy = await queryOne(
        `SELECT * FROM automation_policies WHERE tenant_id = $1 AND enabled = true ORDER BY created_at DESC LIMIT 1`,
        [tid],
      );
    }

    const controlMode = String(policy?.control_mode ?? 'approval_required');
    if (controlMode === 'manual_only' && mode === 'live') {
      throw new ForbiddenException('Policy is manual_only — live execution not permitted via automation');
    }
    if (controlMode === 'read_only' && mode !== 'simulation') {
      throw new ForbiddenException('Policy is read_only — only simulation permitted');
    }
    if (controlMode === 'maintenance_window' && !inMaintenanceWindow((policy?.maintenance_windows as never) ?? [])) {
      throw new ForbiddenException('Outside maintenance window');
    }
    if (mode === 'live') {
      // Never allow fully autonomous production
      if (controlMode === 'auto_execute') {
        throw new ForbiddenException('auto_execute cannot start live mode (no autonomous production)');
      }
      if (policy && policy.require_approval === false) {
        throw new ForbiddenException('live mode requires approval');
      }
    }

    const needsApproval =
      mode === 'live' ||
      (mode !== 'simulation' &&
        (controlMode === 'approval_required' ||
          (policy?.require_approval === true && controlMode !== 'auto_execute')));

    // auto_execute may skip approval only for simulation/dry_run
    const skipApproval =
      mode === 'simulation' || (controlMode === 'auto_execute' && mode !== 'live');

    const exec = await queryOne<{ id: string }>(
      `INSERT INTO automation_executions
         (tenant_id, workflow_id, mode, status, state, started_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING id`,
      [
        tid,
        workflow.id,
        mode,
        needsApproval && !skipApproval ? 'awaiting_approval' : 'queued',
        JSON.stringify({ context: body.context ?? {}, signatureHash: workflow.signature_hash }),
        user.sub,
      ],
    );

    if (needsApproval && !skipApproval) {
      const levels = Number(policy?.max_approval_levels ?? 1);
      const ttl = Number(policy?.approval_ttl_minutes ?? 240);
      for (let level = 1; level <= Math.max(1, levels); level++) {
        await query(
          `INSERT INTO automation_approvals
             (tenant_id, execution_id, level, status, requested_by, expires_at)
           VALUES ($1, $2, $3, 'pending', $4, NOW() + ($5 || ' minutes')::interval)`,
          [tid, exec!.id, level, user.sub, String(ttl)],
        );
      }
      await this.history(tid, user.sub, 'execution.awaiting_approval', 'execution', exec!.id, { mode, levels });
      return this.getExecution(tid, user, exec!.id);
    }

    await this.history(tid, user.sub, 'execution.started', 'execution', exec!.id, { mode });
    if (mode === 'simulation') {
      return this.runSimulation(tid, user, exec!.id, workflow);
    }
    return this.runEngine(tid, user, exec!.id, workflow, mode);
  }

  private flattenSteps(definition: WorkflowDefinition, state: Record<string, unknown>): WorkflowStep[] {
    const out: WorkflowStep[] = [];
    const walk = (steps: WorkflowStep[]) => {
      for (const step of steps) {
        if (step.type === 'parallel' && Array.isArray(step.parallel)) {
          out.push({ ...step, type: 'parallel' });
          continue;
        }
        if (step.type === 'branch' && Array.isArray(step.branches)) {
          const ctx = (state.context as Record<string, unknown> | undefined) ?? {};
          const flag = String(state.branch ?? ctx.branch ?? 'default');
          const match = step.branches.find((b) => b.when === flag) ?? step.branches[0];
          if (match) walk(match.steps);
          continue;
        }
        out.push(step);
      }
    };
    walk(definition.steps ?? []);
    return out;
  }

  private async simulateStep(step: WorkflowStep, mode: string) {
    const retries = step.retries ?? 0;
    const timeoutMs = step.timeoutMs ?? 5000;
    return {
      action: step.action,
      key: step.key,
      mode,
      predicted: true,
      productionMutation: false,
      timeoutMs,
      retries,
      compensate: step.compensate ?? null,
      readOnly: !!step.readOnly || mode === 'simulation',
      outcome: 'would_execute',
    };
  }

  private async runSimulation(
    tid: string,
    user: JwtPayload,
    executionId: string,
    workflow: { id: string; definition: WorkflowDefinition },
  ) {
    const definition =
      typeof workflow.definition === 'string'
        ? (JSON.parse(workflow.definition) as WorkflowDefinition)
        : workflow.definition;
    const state = { branch: 'default' };
    const steps = this.flattenSteps(definition, state);
    const predicted: unknown[] = [];
    const dependencyImpact: unknown[] = [];
    const rollbackPreview: unknown[] = [];
    let estimated = 0;

    await query(
      `UPDATE automation_executions SET status = 'running', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [executionId, tid],
    );

    let idx = 0;
    for (const step of steps) {
      if (step.type === 'parallel' && step.parallel) {
        const parallelOut = [];
        for (const p of step.parallel) {
          const sim = await this.simulateStep(p, 'simulation');
          parallelOut.push(sim);
          estimated += sim.timeoutMs;
          if (p.compensate) rollbackPreview.push({ step: p.key, compensate: p.compensate });
          dependencyImpact.push({ step: p.key, dependsOn: step.key, parallel: true });
        }
        predicted.push({ parallel: parallelOut });
        await query(
          `INSERT INTO automation_execution_steps
             (execution_id, step_key, step_index, status, attempt, input, output, started_at, completed_at)
           VALUES ($1, $2, $3, 'succeeded', 1, '{}'::jsonb, $4::jsonb, NOW(), NOW())`,
          [executionId, step.key, idx, JSON.stringify({ parallel: parallelOut })],
        );
      } else {
        const sim = await this.simulateStep(step, 'simulation');
        predicted.push(sim);
        estimated += sim.timeoutMs;
        if (step.compensate) rollbackPreview.push({ step: step.key, compensate: step.compensate });
        dependencyImpact.push({ step: step.key, action: step.action, order: idx });
        await query(
          `INSERT INTO automation_execution_steps
             (execution_id, step_key, step_index, status, attempt, input, output, started_at, completed_at)
           VALUES ($1, $2, $3, 'succeeded', 1, '{}'::jsonb, $4::jsonb, NOW(), NOW())`,
          [executionId, step.key, idx, JSON.stringify(sim)],
        );
      }
      idx++;
    }

    const report = {
      valid: true,
      stepCount: steps.length,
      productionStateChanges: false,
      message: 'Simulation only — no production state changes',
    };

    const sim = await queryOne(
      `INSERT INTO automation_simulations
         (tenant_id, workflow_id, execution_id, report, predicted_changes, dependency_impact,
          estimated_duration_ms, rollback_preview, created_by)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8::jsonb, $9)
       RETURNING *`,
      [
        tid,
        workflow.id,
        executionId,
        JSON.stringify(report),
        JSON.stringify(predicted),
        JSON.stringify(dependencyImpact),
        estimated,
        JSON.stringify(rollbackPreview),
        user.sub,
      ],
    );

    await query(
      `UPDATE automation_executions
       SET status = 'completed', predicted_changes = $3::jsonb, result = $4::jsonb,
           current_step = $5, completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [
        executionId,
        tid,
        JSON.stringify(predicted),
        JSON.stringify({ simulationId: sim?.id, report }),
        steps.length,
      ],
    );

    await this.history(tid, user.sub, 'simulation.completed', 'execution', executionId, {
      simulationId: sim?.id,
    });
    return this.getExecution(tid, user, executionId);
  }

  private async runEngine(
    tid: string,
    user: JwtPayload,
    executionId: string,
    workflow: { id: string; definition: WorkflowDefinition },
    mode: 'dry_run' | 'live',
  ) {
    const definition =
      typeof workflow.definition === 'string'
        ? (JSON.parse(workflow.definition) as WorkflowDefinition)
        : workflow.definition;
    const state: Record<string, unknown> = { branch: 'default' };
    const steps = this.flattenSteps(definition, state);

    await query(
      `UPDATE automation_executions SET status = 'running', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [executionId, tid],
    );

    const results: unknown[] = [];
    let idx = 0;
    try {
      for (const step of steps) {
        // Re-check e-stop mid-run
        const control = await queryOne<{ emergency_stop: boolean; paused: boolean }>(
          `SELECT emergency_stop, paused FROM automation_control_plane WHERE tenant_id = $1`,
          [tid],
        );
        if (control?.emergency_stop || control?.paused) {
          await query(
            `UPDATE automation_executions SET status = 'paused', current_step = $3, updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2`,
            [executionId, tid, idx],
          );
          await this.history(tid, user.sub, 'execution.paused', 'execution', executionId, {
            reason: 'emergency_stop_or_pause',
          });
          return this.getExecution(tid, user, executionId);
        }

        const attempts = (step.retries ?? 0) + 1;
        let lastError: string | null = null;
        let succeeded = false;
        let output: Record<string, unknown> = {};

        for (let attempt = 1; attempt <= attempts; attempt++) {
          const started = Date.now();
          try {
            // Controlled adapter: records intended action; live still does not mutate external systems in Wave 4
            output = {
              action: step.action,
              key: step.key,
              mode,
              productionMutation: false,
              controlled: true,
              note:
                mode === 'live'
                  ? 'Approved live path recorded; external remediator not auto-invoked (Wave 4 controlled)'
                  : 'Dry-run only',
              elapsedMs: Date.now() - started,
              attempt,
            };
            if (step.timeoutMs && Date.now() - started > step.timeoutMs) {
              throw new Error('step_timeout');
            }
            await query(
              `INSERT INTO automation_execution_steps
                 (execution_id, step_key, step_index, status, attempt, input, output, started_at, completed_at)
               VALUES ($1, $2, $3, 'succeeded', $4, '{}'::jsonb, $5::jsonb, NOW(), NOW())`,
              [executionId, step.key, idx, attempt, JSON.stringify(output)],
            );
            succeeded = true;
            break;
          } catch (e) {
            lastError = (e as Error).message;
            await query(
              `INSERT INTO automation_execution_steps
                 (execution_id, step_key, step_index, status, attempt, input, output, started_at, completed_at)
               VALUES ($1, $2, $3, $6, $4, '{}'::jsonb, $5::jsonb, NOW(), NOW())`,
              [
                executionId,
                step.key,
                idx,
                attempt,
                JSON.stringify({ error: lastError }),
                lastError === 'step_timeout' ? 'timed_out' : 'failed',
              ],
            );
          }
        }

        if (!succeeded) {
          // Compensation path
          if (step.compensate) {
            await query(
              `UPDATE automation_executions SET status = 'compensating', updated_at = NOW() WHERE id = $1`,
              [executionId],
            );
            await query(
              `INSERT INTO automation_execution_steps
                 (execution_id, step_key, step_index, status, attempt, input, output, started_at, completed_at)
               VALUES ($1, $2, $3, 'compensated', 1, '{}'::jsonb, $4::jsonb, NOW(), NOW())`,
              [
                executionId,
                `${step.key}:compensate`,
                idx,
                JSON.stringify({ compensate: step.compensate, forError: lastError }),
              ],
            );
            await query(
              `UPDATE automation_executions
               SET status = 'rolled_back', error = $3, current_step = $4, completed_at = NOW(), updated_at = NOW()
               WHERE id = $1 AND tenant_id = $2`,
              [executionId, tid, lastError, idx],
            );
            await this.history(tid, user.sub, 'execution.rolled_back', 'execution', executionId, {
              error: lastError,
              compensate: step.compensate,
            });
            return this.getExecution(tid, user, executionId);
          }
          await query(
            `UPDATE automation_executions
             SET status = 'failed', error = $3, current_step = $4, completed_at = NOW(), updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2`,
            [executionId, tid, lastError, idx],
          );
          await this.history(tid, user.sub, 'execution.failed', 'execution', executionId, { error: lastError });
          return this.getExecution(tid, user, executionId);
        }

        results.push(output);
        idx++;
        await query(
          `UPDATE automation_executions SET current_step = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
          [executionId, tid, idx],
        );
      }

      await query(
        `UPDATE automation_executions
         SET status = 'completed', result = $3::jsonb, completed_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [executionId, tid, JSON.stringify({ steps: results, mode })],
      );
      await this.history(tid, user.sub, 'execution.completed', 'execution', executionId, { mode });
      return this.getExecution(tid, user, executionId);
    } catch (e) {
      await query(
        `UPDATE automation_executions
         SET status = 'failed', error = $3, completed_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [executionId, tid, (e as Error).message],
      );
      throw e;
    }
  }

  async resumeExecution(tenantId: string | undefined, user: JwtPayload, executionId: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    await this.assertCanStart(tid);
    const exec = await queryOne<{
      id: string;
      status: string;
      mode: string;
      workflow_id: string;
      current_step: number;
    }>(`SELECT * FROM automation_executions WHERE id = $1 AND tenant_id = $2`, [executionId, tid]);
    if (!exec) throw new NotFoundException('Execution not found');
    if (!['paused', 'queued'].includes(exec.status)) {
      throw new BadRequestException(`Cannot resume execution in status ${exec.status}`);
    }
    if (exec.status === 'awaiting_approval') {
      throw new BadRequestException('Execution awaits approval');
    }
    const workflow = await queryOne<{ id: string; definition: WorkflowDefinition }>(
      `SELECT id, definition FROM automation_workflows WHERE id = $1 AND tenant_id = $2`,
      [exec.workflow_id, tid],
    );
    if (!workflow) throw new NotFoundException('Workflow not found');
    await query(
      `UPDATE automation_executions SET status = 'queued', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [executionId, tid],
    );
    await this.history(tid, user.sub, 'execution.resumed', 'execution', executionId, {});
    if (exec.mode === 'simulation') return this.runSimulation(tid, user, executionId, workflow);
    return this.runEngine(tid, user, executionId, workflow, exec.mode as 'dry_run' | 'live');
  }

  async cancelExecution(tenantId: string | undefined, user: JwtPayload, executionId: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const row = await queryOne(
      `UPDATE automation_executions
       SET status = 'cancelled', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status IN ('queued','awaiting_approval','running','paused')
       RETURNING *`,
      [executionId, tid],
    );
    if (!row) throw new NotFoundException('Execution not cancellable');
    await query(
      `UPDATE automation_approvals SET status = 'rejected', decided_by = $3, decided_at = NOW(), comment = 'cancelled'
       WHERE execution_id = $1 AND tenant_id = $2 AND status = 'pending'`,
      [executionId, tid, user.sub],
    );
    await this.history(tid, user.sub, 'execution.cancelled', 'execution', executionId, {});
    return row;
  }

  async getExecution(tenantId: string | undefined, user: JwtPayload, id: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const execution = await queryOne(`SELECT * FROM automation_executions WHERE id = $1 AND tenant_id = $2`, [
      id,
      tid,
    ]);
    if (!execution) throw new NotFoundException('Execution not found');
    const steps = await query(
      `SELECT * FROM automation_execution_steps WHERE execution_id = $1 ORDER BY step_index ASC, attempt ASC`,
      [id],
    );
    const approvals = await query(
      `SELECT * FROM automation_approvals WHERE execution_id = $1 AND tenant_id = $2 ORDER BY level ASC`,
      [id, tid],
    );
    return { execution, steps, approvals };
  }

  async listExecutions(tenantId: string | undefined, user: JwtPayload, status?: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const executions = status
      ? await query(
          `SELECT * FROM automation_executions WHERE tenant_id = $1 AND status = $2 ORDER BY started_at DESC LIMIT 100`,
          [tid, status],
        )
      : await query(
          `SELECT * FROM automation_executions WHERE tenant_id = $1 ORDER BY started_at DESC LIMIT 100`,
          [tid],
        );
    return { executions };
  }

  async listApprovals(tenantId: string | undefined, user: JwtPayload, status = 'pending') {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    // Expire overdue
    await query(
      `UPDATE automation_approvals SET status = 'expired', decided_at = NOW()
       WHERE tenant_id = $1 AND status = 'pending' AND expires_at IS NOT NULL AND expires_at < NOW()`,
      [tid],
    );
    const approvals = await query(
      `SELECT a.*, e.mode, e.status AS execution_status, e.workflow_id
       FROM automation_approvals a
       JOIN automation_executions e ON e.id = a.execution_id
       WHERE a.tenant_id = $1 AND a.status = $2
       ORDER BY a.created_at ASC`,
      [tid, status],
    );
    return { approvals };
  }

  async decideApproval(
    tenantId: string | undefined,
    user: JwtPayload,
    approvalId: string,
    body: { decision: 'approved' | 'rejected' | 'emergency_approved'; comment?: string },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!['approved', 'rejected', 'emergency_approved'].includes(body.decision)) {
      throw new BadRequestException('invalid decision');
    }
    const approval = await queryOne<{
      id: string;
      execution_id: string;
      level: number;
      status: string;
      expires_at: string | null;
    }>(`SELECT * FROM automation_approvals WHERE id = $1 AND tenant_id = $2`, [approvalId, tid]);
    if (!approval) throw new NotFoundException('Approval not found');
    if (approval.status !== 'pending') throw new BadRequestException('Approval already decided');
    if (approval.expires_at && new Date(approval.expires_at) < new Date()) {
      await query(`UPDATE automation_approvals SET status = 'expired', decided_at = NOW() WHERE id = $1`, [
        approvalId,
      ]);
      throw new BadRequestException('Approval expired');
    }

    const status = body.decision === 'emergency_approved' ? 'emergency_approved' : body.decision;
    await query(
      `UPDATE automation_approvals
       SET status = $3, decided_by = $4, comment = $5, decided_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [approvalId, tid, status, user.sub, body.comment ?? null],
    );

    await this.history(tid, user.sub, `approval.${status}`, 'approval', approvalId, {
      executionId: approval.execution_id,
      comment: body.comment,
    });

    if (body.decision === 'rejected') {
      await query(
        `UPDATE automation_executions SET status = 'cancelled', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [approval.execution_id, tid],
      );
      return this.getExecution(tid, user, approval.execution_id);
    }

    // Check remaining pending levels
    const pending = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM automation_approvals
       WHERE execution_id = $1 AND tenant_id = $2 AND status = 'pending'`,
      [approval.execution_id, tid],
    );
    if (Number(pending?.c ?? 0) > 0 && body.decision !== 'emergency_approved') {
      return this.getExecution(tid, user, approval.execution_id);
    }

    // Emergency approval clears remaining pending
    if (body.decision === 'emergency_approved') {
      await query(
        `UPDATE automation_approvals SET status = 'emergency_approved', decided_by = $3, decided_at = NOW(), comment = 'superseded by emergency'
         WHERE execution_id = $1 AND tenant_id = $2 AND status = 'pending'`,
        [approval.execution_id, tid, user.sub],
      );
    }

    await this.assertCanStart(tid);
    const exec = await queryOne<{ mode: string; workflow_id: string }>(
      `SELECT mode, workflow_id FROM automation_executions WHERE id = $1 AND tenant_id = $2`,
      [approval.execution_id, tid],
    );
    await query(
      `UPDATE automation_executions
       SET status = 'queued', approved_by = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [approval.execution_id, tid, user.sub],
    );
    const workflow = await queryOne<{ id: string; definition: WorkflowDefinition }>(
      `SELECT id, definition FROM automation_workflows WHERE id = $1 AND tenant_id = $2`,
      [exec!.workflow_id, tid],
    );
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (exec!.mode === 'simulation') return this.runSimulation(tid, user, approval.execution_id, workflow);
    return this.runEngine(tid, user, approval.execution_id, workflow, exec!.mode as 'dry_run' | 'live');
  }

  async createSimulation(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { workflowId: string; context?: Record<string, unknown> },
  ) {
    return this.startExecution(tenantId, user, {
      workflowId: body.workflowId,
      mode: 'simulation',
      context: body.context,
    });
  }

  async listSimulations(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const simulations = await query(
      `SELECT * FROM automation_simulations WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [tid],
    );
    return { simulations };
  }

  async listHistory(
    tenantId: string | undefined,
    user: JwtPayload,
    opts?: { eventType?: string; q?: string; limit?: number },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const limit = Math.min(opts?.limit ?? 100, 500);
    let events;
    if (opts?.eventType) {
      events = await query(
        `SELECT * FROM automation_history_events
         WHERE tenant_id = $1 AND event_type = $2
         ORDER BY created_at DESC LIMIT $3`,
        [tid, opts.eventType, limit],
      );
    } else if (opts?.q) {
      events = await query(
        `SELECT * FROM automation_history_events
         WHERE tenant_id = $1 AND (
           event_type ILIKE $2 OR resource_type ILIKE $2 OR detail::text ILIKE $2
         )
         ORDER BY created_at DESC LIMIT $3`,
        [tid, `%${opts.q}%`, limit],
      );
    } else {
      events = await query(
        `SELECT * FROM automation_history_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [tid, limit],
      );
    }
    return {
      events,
      export: {
        format: 'json',
        count: events.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
