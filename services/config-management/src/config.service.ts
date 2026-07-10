import { createHash } from 'crypto';
import { query, queryOne } from '@opsedge360/shared-db';

export interface ConfigTemplate {
  id: string;
  tenant_id: string;
  name: string;
  template_body: string;
  variables: unknown[];
  policy_rules: unknown[];
  version: number;
}

function renderTemplate(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? '');
}

function checksum(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function listTemplates(tenantId: string): Promise<ConfigTemplate[]> {
  return query<ConfigTemplate>(
    'SELECT * FROM config_templates WHERE tenant_id = $1 ORDER BY name, version DESC',
    [tenantId],
  );
}

export async function createTemplate(
  tenantId: string,
  data: { name: string; templateBody: string; variables?: unknown[]; policyRules?: unknown[] },
): Promise<ConfigTemplate> {
  const row = await queryOne<ConfigTemplate>(
    `INSERT INTO config_templates (tenant_id, name, template_body, variables, policy_rules)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [
      tenantId,
      data.name,
      data.templateBody,
      JSON.stringify(data.variables ?? []),
      JSON.stringify(data.policyRules ?? []),
    ],
  );
  if (!row) throw new Error('Failed to create template');
  return row;
}

export async function deployTemplate(
  tenantId: string,
  data: {
    templateId: string;
    targetType: string;
    targetId: string;
    variables?: Record<string, string>;
  },
): Promise<{ id: string; checksum: string; rendered: Record<string, unknown> }> {
  const template = await queryOne<ConfigTemplate>(
    'SELECT * FROM config_templates WHERE id = $1 AND tenant_id = $2',
    [data.templateId, tenantId],
  );
  if (!template) throw new Error('Template not found');

  const renderedText = renderTemplate(template.template_body, data.variables ?? {});
  const rendered = { content: renderedText, variables: data.variables ?? {} };
  const sum = checksum(rendered);

  const row = await queryOne<{ id: string }>(
    `INSERT INTO config_deployments
      (tenant_id, template_id, target_type, target_id, rendered_config, checksum, status, deployed_at)
     VALUES ($1,$2,$3,$4,$5,$6,'deployed',NOW())
     RETURNING id`,
    [tenantId, template.id, data.targetType, data.targetId, JSON.stringify(rendered), sum],
  );
  if (!row) throw new Error('Deployment failed');
  return { id: row.id, checksum: sum, rendered };
}

export async function rollbackDeployment(tenantId: string, deploymentId: string): Promise<boolean> {
  const result = await query(
    `UPDATE config_deployments
     SET status = 'rolled_back', rolled_back_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND rolled_back_at IS NULL
     RETURNING id`,
    [deploymentId, tenantId],
  );
  return result.length > 0;
}

export async function detectDrift(
  tenantId: string,
  ciId: string,
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): Promise<{ drifted: boolean; id?: string }> {
  const expectedSum = checksum(expected);
  const actualSum = checksum(actual);
  if (expectedSum === actualSum) return { drifted: false };

  const row = await queryOne<{ id: string }>(
    `INSERT INTO ci_config_drift
      (tenant_id, ci_id, expected_checksum, actual_checksum, drift_details, severity)
     VALUES ($1,$2,$3,$4,$5,'medium')
     RETURNING id`,
    [
      tenantId,
      ciId,
      expectedSum,
      actualSum,
      JSON.stringify({ expected, actual }),
    ],
  );
  return { drifted: true, id: row?.id };
}
