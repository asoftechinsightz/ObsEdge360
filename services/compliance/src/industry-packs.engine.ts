import { query, queryOne } from '@opsedge360/shared-db';
import type { IndustryPack } from '@opsedge360/shared-types';

interface PackRow {
  id: string;
  code: string;
  name: string;
  industry: string;
  description: string | null;
  framework_codes: string[];
  control_count: number;
  enabled?: boolean;
}

export async function listIndustryPacks(tenantId: string): Promise<IndustryPack[]> {
  const rows = await query<PackRow>(
    `SELECT p.*, COALESCE(tip.enabled, false) as enabled
     FROM industry_packs p
     LEFT JOIN tenant_industry_packs tip ON tip.pack_id = p.id AND tip.tenant_id = $1
     ORDER BY p.industry, p.code`,
    [tenantId],
  );
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    industry: r.industry,
    description: r.description ?? undefined,
    frameworkCodes: r.framework_codes,
    controlCount: r.control_count,
    enabled: r.enabled ?? false,
  }));
}

export async function getIndustryPack(tenantId: string, code: string): Promise<IndustryPack | null> {
  const row = await queryOne<PackRow>(
    `SELECT p.*, COALESCE(tip.enabled, false) as enabled
     FROM industry_packs p
     LEFT JOIN tenant_industry_packs tip ON tip.pack_id = p.id AND tip.tenant_id = $1
     WHERE p.code = $2`,
    [tenantId, code],
  );
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    industry: row.industry,
    description: row.description ?? undefined,
    frameworkCodes: row.framework_codes,
    controlCount: row.control_count,
    enabled: row.enabled ?? false,
  };
}

export async function enableIndustryPack(tenantId: string, code: string) {
  const pack = await queryOne<{ id: string; framework_codes: string[] }>(
    `SELECT id, framework_codes FROM industry_packs WHERE code = $1`,
    [code],
  );
  if (!pack) throw new Error(`Industry pack '${code}' not found`);

  await query(
    `INSERT INTO tenant_industry_packs (tenant_id, pack_id, enabled) VALUES ($1, $2, true)
     ON CONFLICT (tenant_id, pack_id) DO UPDATE SET enabled = true, enabled_at = NOW()`,
    [tenantId, pack.id],
  );

  for (const fwCode of pack.framework_codes) {
    await query(
      `INSERT INTO tenant_frameworks (tenant_id, framework_id, enabled)
       SELECT $1, f.id, true FROM compliance_frameworks f WHERE f.code = $2
       ON CONFLICT (tenant_id, framework_id) DO UPDATE SET enabled = true`,
      [tenantId, fwCode],
    );
  }

  return getIndustryPack(tenantId, code);
}

export async function disableIndustryPack(tenantId: string, code: string) {
  const pack = await queryOne<{ id: string }>(`SELECT id FROM industry_packs WHERE code = $1`, [code]);
  if (!pack) throw new Error(`Industry pack '${code}' not found`);

  await query(
    `UPDATE tenant_industry_packs SET enabled = false WHERE tenant_id = $1 AND pack_id = $2`,
    [tenantId, pack.id],
  );

  return { code, enabled: false };
}
