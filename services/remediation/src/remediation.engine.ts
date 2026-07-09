import { query, queryOne } from '@opsedge360/shared-db';
import type { RemediationRunbook } from '@opsedge360/shared-types';

export async function listRunbooks(tenantId: string): Promise<RemediationRunbook[]> {
  const rows = await query<{
    id: string; tenant_id: string; name: string; description: string | null;
    risk_tier: string; auto_execute: boolean; ot_zone_safe: boolean; enabled: boolean;
  }>('SELECT id, tenant_id, name, description, risk_tier, auto_execute, ot_zone_safe, enabled FROM remediation_runbooks WHERE tenant_id = $1 AND enabled = true', [tenantId]);
  return rows.map((r) => ({
    id: r.id, tenantId: r.tenant_id, name: r.name, description: r.description ?? undefined,
    riskTier: r.risk_tier, autoExecute: r.auto_execute, otZoneSafe: r.ot_zone_safe, enabled: r.enabled,
  }));
}

export async function matchRunbooks(tenantId: string, context: Record<string, unknown>) {
  const runbooks = await query<{
    id: string; name: string; risk_tier: string; auto_execute: boolean;
    trigger_conditions: Record<string, unknown>; actions: unknown[];
  }>('SELECT * FROM remediation_runbooks WHERE tenant_id = $1 AND enabled = true', [tenantId]);

  return runbooks.filter((rb) => {
    const cond = rb.trigger_conditions;
    if (cond.alert_title_contains && context.alertTitle) {
      return String(context.alertTitle).toLowerCase().includes(String(cond.alert_title_contains).toLowerCase());
    }
    if (cond.fraud_type && context.fraudType) {
      return cond.fraud_type === context.fraudType;
    }
    if (cond.metric && context.metric) {
      return cond.metric === context.metric && Number(context.value) >= Number(cond.threshold ?? 0);
    }
    return false;
  });
}

export async function requestRemediation(
  tenantId: string,
  runbookId: string,
  context: Record<string, unknown>,
): Promise<{ approvalId?: string; executionId?: string; status: string; message: string }> {
  const rb = await queryOne<{
    id: string; name: string; risk_tier: string; auto_execute: boolean;
    ot_zone_safe: boolean; actions: unknown[];
  }>('SELECT * FROM remediation_runbooks WHERE id = $1 AND tenant_id = $2', [runbookId, tenantId]);

  if (!rb) throw new Error('Runbook not found');

  // OT safety check
  if (context.otZone && !rb.ot_zone_safe) {
    throw new Error('Runbook blocked: OT zone requires ot_zone_safe runbook');
  }

  if (rb.auto_execute && rb.risk_tier === 'low') {
    return executeRemediation(tenantId, rb.id, rb.actions, null);
  }

  // Create approval request
  const approval = await queryOne<{ id: string }>(
    `INSERT INTO remediation_approvals (tenant_id, agent_type, risk_tier, action, evidence, status)
     VALUES ($1,'remediation',$2,$3,$4,'pending') RETURNING id`,
    [tenantId, rb.risk_tier, `Execute runbook: ${rb.name}`, JSON.stringify({ runbookId, context, actions: rb.actions })],
  );

  return {
    approvalId: approval!.id,
    status: 'pending_approval',
    message: `Remediation "${rb.name}" requires ${rb.risk_tier} tier approval`,
  };
}

export async function approveAndExecute(tenantId: string, approvalId: string, resolvedBy = 'admin') {
  const approval = await queryOne<{
    id: string; evidence: string; status: string;
  }>('SELECT * FROM remediation_approvals WHERE id = $1 AND tenant_id = $2', [approvalId, tenantId]);

  if (!approval || approval.status !== 'pending') throw new Error('Approval not found or already resolved');

  const evidence = typeof approval.evidence === 'string' ? JSON.parse(approval.evidence) : (approval.evidence as Record<string, unknown>);
  const runbookId = evidence.runbookId;

  await query(
    'UPDATE remediation_approvals SET status = $2, resolved_at = NOW(), resolved_by = $3 WHERE id = $1',
    [approvalId, 'approved', resolvedBy],
  );

  const rb = await queryOne<{ actions: unknown[] }>('SELECT actions FROM remediation_runbooks WHERE id = $1', [runbookId]);
  return executeRemediation(tenantId, runbookId, rb?.actions ?? [], approvalId);
}

async function executeRemediation(
  tenantId: string,
  runbookId: string,
  actions: unknown,
  approvalId: string | null,
) {
  const executed: unknown[] = [];
  const actionList = Array.isArray(actions) ? actions : [];

  for (const action of actionList) {
    const a = action as Record<string, unknown>;
    // Phase 3: simulate safe action execution
    executed.push({
      type: a.type,
      target: a.target,
      status: 'simulated_success',
      timestamp: new Date().toISOString(),
      note: 'Action simulated — connect K8s/cloud APIs in production',
    });
  }

  const exec = await queryOne<{ id: string }>(
    `INSERT INTO remediation_executions (tenant_id, runbook_id, approval_id, status, actions_executed, outcome, completed_at)
     VALUES ($1,$2,$3,'completed',$4,$5,NOW()) RETURNING id`,
    [tenantId, runbookId, approvalId, JSON.stringify(executed), `Executed ${executed.length} action(s) successfully`],
  );

  return {
    executionId: exec!.id,
    status: 'completed',
    message: `Remediation executed: ${executed.length} action(s)`,
    actions: executed,
  };
}

export async function listExecutions(tenantId: string) {
  return query(
    `SELECT re.*, rb.name as runbook_name FROM remediation_executions re
     LEFT JOIN remediation_runbooks rb ON rb.id = re.runbook_id
     WHERE re.tenant_id = $1 ORDER BY re.started_at DESC LIMIT 20`,
    [tenantId],
  );
}

export async function listOtSafetyZones(tenantId: string) {
  return query(
    'SELECT * FROM ot_safety_zones WHERE tenant_id = $1 ORDER BY name',
    [tenantId],
  );
}
