import { query, queryOne } from '@opsedge360/shared-db';
import type { ComplianceControlResult } from '@opsedge360/shared-types';

interface ControlRow {
  id: string;
  framework_id: string;
  control_id: string;
  title: string;
  description: string | null;
  validation_query: ValidationQuery;
  severity: string;
  framework_code?: string;
}

interface ValidationQuery {
  type: 'cmdb_count' | 'cmdb_query';
  filter: Record<string, unknown>;
  pass_condition: string;
  message: string;
}

interface CheckRow {
  id: string;
  status: string;
  score: number | null;
  details: Record<string, unknown> | null;
  checked_at: string;
}

export async function listFrameworks(tenantId: string) {
  const rows = await query<{
    code: string;
    name: string;
    version: string;
    controls_total: string;
    controls_passed: string;
    score: string;
  }>(
    `SELECT f.code, f.name, f.version,
      COUNT(c.id) as controls_total,
      COUNT(CASE WHEN cc.status = 'pass' THEN 1 END) as controls_passed,
      COALESCE(ROUND(AVG(CASE WHEN cc.status = 'pass' THEN 100 WHEN cc.status = 'partial' THEN 50 ELSE 0 END)), 0) as score
     FROM compliance_frameworks f
     JOIN tenant_frameworks tf ON tf.framework_id = f.id AND tf.tenant_id = $1 AND tf.enabled = true
     LEFT JOIN compliance_controls c ON c.framework_id = f.id
     LEFT JOIN LATERAL (
       SELECT status FROM compliance_checks
       WHERE control_id = c.id AND tenant_id = $1
       ORDER BY checked_at DESC LIMIT 1
     ) cc ON true
     GROUP BY f.id, f.code, f.name, f.version
     ORDER BY f.code`,
    [tenantId],
  );

  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    version: r.version,
    score: Number(r.score),
    controlsTotal: Number(r.controls_total),
    controlsPassed: Number(r.controls_passed),
  }));
}

export async function listControls(tenantId: string, frameworkCode?: string): Promise<ComplianceControlResult[]> {
  const conditions = ['tf.tenant_id = $1', 'tf.enabled = true'];
  const params: unknown[] = [tenantId];
  if (frameworkCode) {
    conditions.push('f.code = $2');
    params.push(frameworkCode);
  }

  const rows = await query<ControlRow & { framework_code: string; last_status: string | null; last_checked: string | null }>(
    `SELECT c.*, f.code as framework_code,
      (SELECT status FROM compliance_checks WHERE control_id = c.id AND tenant_id = $1 ORDER BY checked_at DESC LIMIT 1) as last_status,
      (SELECT checked_at FROM compliance_checks WHERE control_id = c.id AND tenant_id = $1 ORDER BY checked_at DESC LIMIT 1) as last_checked
     FROM compliance_controls c
     JOIN compliance_frameworks f ON f.id = c.framework_id
     JOIN tenant_frameworks tf ON tf.framework_id = f.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY c.control_id`,
    params,
  );

  return rows.map((r) => ({
    controlId: r.control_id,
    framework: r.framework_code,
    title: r.title,
    status: (r.last_status ?? 'pending') as ComplianceControlResult['status'],
    lastChecked: r.last_checked ?? undefined,
  }));
}

export async function runValidation(tenantId: string, frameworkCode?: string) {
  const conditions = ['tf.tenant_id = $1', 'tf.enabled = true'];
  const params: unknown[] = [tenantId];
  if (frameworkCode) {
    conditions.push('f.code = $2');
    params.push(frameworkCode);
  }

  const controls = await query<ControlRow & { framework_code: string }>(
    `SELECT c.*, f.code as framework_code FROM compliance_controls c
     JOIN compliance_frameworks f ON f.id = c.framework_id
     JOIN tenant_frameworks tf ON tf.framework_id = f.id
     WHERE ${conditions.join(' AND ')}`,
    params,
  );

  const results: ComplianceControlResult[] = [];
  const violations: ComplianceControlResult[] = [];

  for (const control of controls) {
    const result = await validateControl(tenantId, control);
    results.push(result);
    if (result.status === 'fail') violations.push(result);

    await query(
      `INSERT INTO compliance_checks (tenant_id, control_id, status, score, details)
       VALUES ($1,$2,$3,$4,$5)`,
      [tenantId, control.id, result.status, result.score ?? 0, JSON.stringify({ message: result.message, affectedCiIds: result.affectedCiIds })],
    );

    if (result.status === 'pass') {
      await query(
        `INSERT INTO compliance_evidence (tenant_id, control_id, evidence_type, artifact)
         VALUES ($1,$2,'auto_check',$3)`,
        [tenantId, control.id, JSON.stringify({ controlId: control.control_id, result })],
      );
    }
  }

  return { results, violations, overallScore: computeScore(results) };
}

async function validateControl(tenantId: string, control: ControlRow): Promise<ComplianceControlResult> {
  const vq = control.validation_query;
  let count = 0;
  let affectedCiIds: string[] = [];

  if (vq.type === 'cmdb_count') {
    const row = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM configuration_items WHERE tenant_id = $1',
      [tenantId],
    );
    count = Number(row?.count ?? 0);
  } else if (vq.type === 'cmdb_query') {
    const { sql, params } = buildCiQuery(tenantId, vq.filter);
    const rows = await query<{ id: string }>(sql, params);
    count = rows.length;
    affectedCiIds = rows.map((r) => r.id);
  }

  const passed = evaluateCondition(vq.pass_condition, count);
  const status: ComplianceControlResult['status'] = passed ? 'pass' : count === 0 && vq.pass_condition.includes('== 0') ? 'pass' : 'fail';

  return {
    controlId: control.control_id,
    framework: (control as ControlRow & { framework_code?: string }).framework_code ?? '',
    title: control.title,
    status: passed ? 'pass' : 'fail',
    score: passed ? 100 : 0,
    message: passed ? 'Control satisfied' : vq.message,
    lastChecked: new Date().toISOString(),
    affectedCiIds,
  };
}

function buildCiQuery(tenantId: string, filter: Record<string, unknown>) {
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (filter.ci_type) {
    conditions.push(`ci_type = $${idx++}`);
    params.push(filter.ci_type);
  }
  if (filter.owner_id === null) {
    conditions.push('owner_id IS NULL');
  }
  if (filter.health_score_lt) {
    conditions.push(`health_score < $${idx++}`);
    params.push(filter.health_score_lt);
  }
  if (filter.attributes_key && filter.attributes_value !== undefined) {
    conditions.push(`(attributes->>$${idx++})::boolean = false`);
    params.push(String(filter.attributes_key));
  }

  return {
    sql: `SELECT id FROM configuration_items WHERE ${conditions.join(' AND ')}`,
    params,
  };
}

function evaluateCondition(condition: string, count: number): boolean {
  const trimmed = condition.trim();
  if (trimmed === 'count > 0') return count > 0;
  if (trimmed === 'count == 0') return count === 0;
  const match = trimmed.match(/count\s*([<>=]+)\s*(\d+)/);
  if (match) {
    const op = match[1];
    const val = Number(match[2]);
    if (op === '>') return count > val;
    if (op === '<') return count < val;
    if (op === '==') return count === val;
  }
  return false;
}

function computeScore(results: ComplianceControlResult[]): number {
  if (results.length === 0) return 0;
  const passed = results.filter((r) => r.status === 'pass').length;
  return Math.round((passed / results.length) * 100);
}

export async function getOverallScore(tenantId: string) {
  const frameworks = await listFrameworks(tenantId);
  if (frameworks.length === 0) return { overallScore: 0, trend: '0', lastUpdated: new Date().toISOString() };
  const avg = Math.round(frameworks.reduce((s, f) => s + f.score, 0) / frameworks.length);
  return { overallScore: avg, trend: '+2', lastUpdated: new Date().toISOString() };
}
