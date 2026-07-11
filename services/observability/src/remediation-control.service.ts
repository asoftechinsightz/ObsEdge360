import { query, queryOne } from '@opsedge360/shared-db';
import { EventBus, TOPICS, createEvent } from '@opsedge360/event-bus';

const POLICY_VERSION = 'remediation-v1';

let bus: EventBus | null = null;
function getBus() {
  if (!bus) bus = new EventBus('remediation-control');
  return bus;
}

async function emitSignal(
  tenantId: string,
  signalType: string,
  severity: string,
  title: string,
  payload: Record<string, unknown> = {},
  refId?: string,
) {
  await query(
    `INSERT INTO ops_intelligence_signals (tenant_id, signal_type, severity, ref_id, title, payload)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [tenantId, signalType, severity, refId ?? null, title, JSON.stringify(payload)],
  ).catch(() => undefined);
  try {
    const b = getBus();
    await b.connect();
    await b.publish(
      TOPICS.OPS_SIGNAL,
      createEvent('ops_intelligence.signal', tenantId, { signalType, severity, title, payload, refId }),
    );
  } catch {
    /* soft */
  }
}

async function audit(
  tenantId: string,
  requestId: string,
  eventType: string,
  actor: string | undefined,
  detail: Record<string, unknown>,
) {
  await query(
    `INSERT INTO remediation_audit_events (tenant_id, request_id, event_type, actor, detail)
     VALUES ($1,$2,$3,$4,$5)`,
    [tenantId, requestId, eventType, actor ?? null, JSON.stringify(detail)],
  ).catch(() => undefined);
}

function normalizeActionKey(action: string): string {
  const raw = action.trim().toLowerCase();
  if (/restart/.test(raw)) return 'restart_service';
  if (/scale/.test(raw)) return 'scale_replicas';
  if (/cache/.test(raw)) return 'clear_cache';
  if (/pool|connection/.test(raw)) return 'rotate_connection_pool';
  if (/notify|on[- ]?call|page/.test(raw)) return 'notify_oncall';
  if (/rollback/.test(raw)) return 'rollback_deploy';
  if (/investigate|stabiliz/.test(raw)) return 'investigate_stabilize';
  return raw
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 100) || 'custom_action';
}

function normalizeMode(mode?: string): 'dry_run' | 'live' {
  return mode === 'live' ? 'live' : 'dry_run';
}

function normalizeRisk(tier?: string): string {
  const t = (tier || 'medium').toLowerCase();
  if (t === 'low' || t === 'medium' || t === 'high' || t === 'critical') return t;
  return 'medium';
}

function requiresApproval(riskTier: string, mode: 'dry_run' | 'live'): boolean {
  if (mode === 'live') return true;
  if (riskTier === 'low') return false;
  return true; // medium/high/critical dry_run
}

export function mapRemediation(row: Record<string, unknown>) {
  return {
    id: row.id,
    incidentId: row.incident_id,
    action: row.action,
    actionKey: row.action_key,
    riskTier: row.risk_tier,
    evidence: row.evidence,
    status: row.status,
    executionMode: row.execution_mode,
    executionResult: row.execution_result,
    requiresApproval: row.requires_approval,
    policyVersion: row.policy_version,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectionReason: row.rejection_reason,
    requestedBy: row.requested_by,
    resolvedBy: row.resolved_by,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    metadata: row.metadata,
  };
}

export async function listCatalog() {
  return query(
    `SELECT action_key, display_name, risk_tier, live_allowed, description, enabled
     FROM remediation_action_catalog
     WHERE enabled = true
     ORDER BY risk_tier, action_key`,
  );
}

export async function requestRemediation(
  tenantId: string,
  opts: {
    action: string;
    incidentId?: string;
    riskTier?: string;
    evidence?: string;
    requestedBy?: string;
    executionMode?: string;
    actionKey?: string;
  },
) {
  if (!opts.action?.trim()) throw new Error('action required');
  const mode = normalizeMode(opts.executionMode);
  const actionKey = opts.actionKey?.trim() || normalizeActionKey(opts.action);

  const catalog = await queryOne<{
    action_key: string;
    risk_tier: string;
    live_allowed: boolean;
  }>(
    `SELECT action_key, risk_tier, live_allowed FROM remediation_action_catalog
     WHERE action_key = $1 AND enabled = true`,
    [actionKey],
  );

  if (mode === 'live') {
    if (!catalog) throw new Error(`Action '${actionKey}' is not in the live allowlist catalog`);
    if (!catalog.live_allowed) {
      throw new Error(`Action '${actionKey}' is not allowed for live execution`);
    }
  }

  const riskTier = normalizeRisk(opts.riskTier ?? catalog?.risk_tier ?? 'medium');
  if (riskTier === 'critical' && mode === 'live') {
    throw new Error('Critical risk actions cannot be requested for live execution');
  }

  const needsApproval = requiresApproval(riskTier, mode);
  const status = 'pending';

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO ops_remediation_requests
      (tenant_id, incident_id, action, risk_tier, evidence, status, execution_mode, requested_by,
       action_key, policy_version, requires_approval, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      tenantId,
      opts.incidentId ?? null,
      opts.action.trim(),
      riskTier,
      opts.evidence ?? null,
      status,
      mode,
      opts.requestedBy ?? null,
      actionKey,
      POLICY_VERSION,
      needsApproval,
      JSON.stringify({ catalogMatched: Boolean(catalog), liveAllowed: catalog?.live_allowed ?? false }),
    ],
  );

  await audit(tenantId, String(row!.id), 'requested', opts.requestedBy, {
    mode,
    riskTier,
    actionKey,
    requiresApproval: needsApproval,
  });
  await emitSignal(
    tenantId,
    'remediation_requested',
    riskTier === 'high' || riskTier === 'critical' ? 'warning' : 'info',
    opts.action.slice(0, 200),
    { requestId: row!.id, mode, requiresApproval: needsApproval, actionKey },
    String(row!.id),
  );

  return mapRemediation(row!);
}

export async function listRemediation(tenantId: string, status?: string) {
  const rows = status
    ? await query(
        `SELECT * FROM ops_remediation_requests WHERE tenant_id = $1 AND status = $2
         ORDER BY requested_at DESC LIMIT 100`,
        [tenantId, status],
      )
    : await query(
        `SELECT * FROM ops_remediation_requests WHERE tenant_id = $1
         ORDER BY requested_at DESC LIMIT 100`,
        [tenantId],
      );
  return rows.map((r) => mapRemediation(r as Record<string, unknown>));
}

export async function approveRemediation(
  tenantId: string,
  id: string,
  approvedBy?: string,
) {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM ops_remediation_requests WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
  if (!row) return null;
  if (row.status !== 'pending') throw new Error(`Request status is ${row.status}; cannot approve`);

  const updated = await queryOne<Record<string, unknown>>(
    `UPDATE ops_remediation_requests
     SET status = 'approved', approved_by = $3, approved_at = NOW()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, id, approvedBy ?? null],
  );

  await audit(tenantId, id, 'approved', approvedBy, {});
  await emitSignal(tenantId, 'remediation_approved', 'info', String(row.action).slice(0, 200), {
    requestId: id,
  }, id);

  return mapRemediation(updated!);
}

export async function rejectRemediation(
  tenantId: string,
  id: string,
  opts: { rejectedBy?: string; reason?: string } = {},
) {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM ops_remediation_requests WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
  if (!row) return null;
  if (row.status !== 'pending' && row.status !== 'approved') {
    throw new Error(`Request status is ${row.status}; cannot reject`);
  }

  const updated = await queryOne<Record<string, unknown>>(
    `UPDATE ops_remediation_requests
     SET status = 'rejected', rejection_reason = $3, resolved_by = $4, resolved_at = NOW()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, id, opts.reason ?? null, opts.rejectedBy ?? null],
  );

  await audit(tenantId, id, 'rejected', opts.rejectedBy, { reason: opts.reason ?? null });
  await emitSignal(tenantId, 'remediation_rejected', 'info', String(row.action).slice(0, 200), {
    requestId: id,
    reason: opts.reason,
  }, id);

  return mapRemediation(updated!);
}

async function runLiveAdapter(row: Record<string, unknown>) {
  const actionKey = String(row.action_key ?? normalizeActionKey(String(row.action)));
  const catalog = await queryOne<{ live_allowed: boolean }>(
    `SELECT live_allowed FROM remediation_action_catalog WHERE action_key = $1 AND enabled = true`,
    [actionKey],
  );
  if (!catalog?.live_allowed) {
    throw new Error(`Action '${actionKey}' is not allowlisted for live execution`);
  }

  const webhook = process.env.REMEDIATION_LIVE_WEBHOOK_URL?.trim();
  const payload = {
    requestId: row.id,
    tenantId: row.tenant_id,
    action: row.action,
    actionKey,
    riskTier: row.risk_tier,
    incidentId: row.incident_id,
    policyVersion: POLICY_VERSION,
  };

  if (webhook) {
    const resp = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const text = await resp.text().catch(() => '');
    if (!resp.ok) {
      throw new Error(`Live webhook failed HTTP ${resp.status}: ${text.slice(0, 200)}`);
    }
    return {
      executionMode: 'live' as const,
      simulated: false,
      controlled: true,
      allowlisted: true,
      adapter: 'webhook',
      actionKey,
      webhookStatus: resp.status,
      message: 'Dispatched to REMEDIATION_LIVE_WEBHOOK_URL',
      evaluatedAt: new Date().toISOString(),
      wouldAffect: row.incident_id ? { incidentId: row.incident_id } : {},
    };
  }

  // Honest controlled path without external webhook: audit-only live record
  return {
    executionMode: 'live' as const,
    simulated: false,
    controlled: true,
    allowlisted: true,
    adapter: 'audit_only',
    actionKey,
    message:
      'Live allowlisted action recorded under controlled policy (no REMEDIATION_LIVE_WEBHOOK_URL configured)',
    evaluatedAt: new Date().toISOString(),
    wouldAffect: row.incident_id ? { incidentId: row.incident_id } : {},
  };
}

/**
 * Execute remediation under policy:
 * - low + dry_run: may run from pending (Wave 5 compat)
 * - medium/high or live: requires approved status
 */
export async function executeRemediation(
  tenantId: string,
  id: string,
  resolvedBy?: string,
) {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM ops_remediation_requests WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
  if (!row) return null;

  const mode = normalizeMode(String(row.execution_mode));
  const risk = normalizeRisk(String(row.risk_tier));
  const needsApproval = row.requires_approval !== false && requiresApproval(risk, mode);

  if (row.status === 'rejected' || String(row.status).startsWith('executed')) {
    throw new Error(`Request status is ${row.status}`);
  }

  if (needsApproval) {
    if (row.status !== 'approved') {
      throw new Error('Approval required before execution for this risk/mode');
    }
  } else if (row.status !== 'pending' && row.status !== 'approved') {
    throw new Error(`Request status is ${row.status}`);
  }

  let result: Record<string, unknown>;
  let nextStatus: string;

  if (mode === 'live') {
    result = await runLiveAdapter(row);
    nextStatus = 'executed_live';
  } else {
    result = {
      executionMode: 'dry_run',
      simulated: true,
      controlled: true,
      message: 'Dry-run — no production mutation performed (policy remediation-v1)',
      action: row.action,
      actionKey: row.action_key,
      evaluatedAt: new Date().toISOString(),
      wouldAffect: row.incident_id ? { incidentId: row.incident_id } : {},
    };
    nextStatus = 'executed_dry_run';
  }

  const updated = await queryOne<Record<string, unknown>>(
    `UPDATE ops_remediation_requests
     SET status = $3, execution_result = $4, resolved_by = $5, resolved_at = NOW()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, id, nextStatus, JSON.stringify(result), resolvedBy ?? null],
  );

  await audit(tenantId, id, nextStatus, resolvedBy, { result });
  await emitSignal(
    tenantId,
    mode === 'live' ? 'remediation_live' : 'remediation_dry_run',
    mode === 'live' ? 'warning' : 'info',
    String(row.action).slice(0, 200),
    { requestId: id, result },
    id,
  );

  return mapRemediation(updated!);
}

export async function listAudit(tenantId: string, requestId?: string, limit = 50) {
  if (requestId) {
    return query(
      `SELECT * FROM remediation_audit_events
       WHERE tenant_id = $1 AND request_id = $2
       ORDER BY created_at DESC LIMIT $3`,
      [tenantId, requestId, Math.min(limit, 200)],
    );
  }
  return query(
    `SELECT * FROM remediation_audit_events
     WHERE tenant_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [tenantId, Math.min(limit, 200)],
  );
}

export async function getRemediation(tenantId: string, id: string) {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM ops_remediation_requests WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
  return row ? mapRemediation(row) : null;
}
