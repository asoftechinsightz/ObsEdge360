import { createHash } from 'crypto';
import { query, queryOne } from '@opsedge360/shared-db';

export interface AgentConfigState {
  revision: number;
  config: Record<string, unknown>;
  checksum: string;
}

function computeChecksum(config: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex');
}

export async function getAgentConfig(agentId: string, agentKey: string): Promise<AgentConfigState | null> {
  const row = await queryOne<{
    agent_key_hash: string;
    config_revision: number;
    config_payload: Record<string, unknown>;
    config_checksum: string | null;
  }>(
    'SELECT agent_key_hash, config_revision, config_payload, config_checksum FROM discovery_agents WHERE id = $1',
    [agentId],
  );
  if (!row) return null;
  const { verifyAgentKey } = await import('./agent.util');
  if (!verifyAgentKey(agentKey, row.agent_key_hash)) return null;
  return {
    revision: row.config_revision ?? 0,
    config: row.config_payload ?? {},
    checksum: row.config_checksum ?? computeChecksum(row.config_payload ?? {}),
  };
}

export async function setAgentConfig(
  agentId: string,
  agentKey: string,
  data: { revision: number; config: Record<string, unknown>; checksum: string },
): Promise<AgentConfigState | null> {
  const row = await queryOne<{ agent_key_hash: string }>(
    'SELECT agent_key_hash FROM discovery_agents WHERE id = $1',
    [agentId],
  );
  if (!row) return null;
  const { verifyAgentKey } = await import('./agent.util');
  if (!verifyAgentKey(agentKey, row.agent_key_hash)) return null;

  const checksum = computeChecksum(data.config);
  if (checksum !== data.checksum) throw new Error('Config checksum mismatch');

  await query(
    `UPDATE discovery_agents
     SET config_revision = $2, config_payload = $3, config_checksum = $4
     WHERE id = $1`,
    [agentId, data.revision, JSON.stringify(data.config), checksum],
  );
  await query(
    `INSERT INTO agent_config_history (agent_id, revision, config, checksum, pushed_by)
     VALUES ($1, $2, $3, $4, 'agent')`,
    [agentId, data.revision, JSON.stringify(data.config), checksum],
  );
  return { revision: data.revision, config: data.config, checksum };
}

export async function pushAgentConfig(
  tenantId: string,
  agentId: string,
  config: Record<string, unknown>,
): Promise<AgentConfigState> {
  const row = await queryOne<{ config_revision: number }>(
    'SELECT config_revision FROM discovery_agents WHERE id = $1 AND tenant_id = $2',
    [agentId, tenantId],
  );
  if (!row) throw new Error('Agent not found');
  const revision = (row.config_revision ?? 0) + 1;
  const checksum = computeChecksum(config);
  await query(
    `UPDATE discovery_agents
     SET config_revision = $2, config_payload = $3, config_checksum = $4
     WHERE id = $1`,
    [agentId, revision, JSON.stringify(config), checksum],
  );
  await query(
    `INSERT INTO agent_config_history (agent_id, revision, config, checksum, pushed_by)
     VALUES ($1, $2, $3, $4, 'platform')`,
    [agentId, revision, JSON.stringify(config), checksum],
  );
  return { revision, config, checksum };
}

export async function getAgentUpdateManifest(
  agentId: string,
  agentKey: string,
  currentVersion: string,
): Promise<{ version: string; downloadUrl: string; checksumSha256: string; mandatory: boolean } | null> {
  const row = await queryOne<{ agent_key_hash: string; update_channel: string }>(
    'SELECT agent_key_hash, update_channel FROM discovery_agents WHERE id = $1',
    [agentId],
  );
  if (!row) return null;
  const { verifyAgentKey } = await import('./agent.util');
  if (!verifyAgentKey(agentKey, row.agent_key_hash)) return null;

  const latest = process.env.AGENT_LATEST_VERSION ?? '1.0.0';
  if (latest === currentVersion) return null;
  return {
    version: latest,
    downloadUrl: process.env.AGENT_DOWNLOAD_URL ?? `https://releases.opsedge360.asoftechinsightz.com/agents/${latest}`,
    checksumSha256: process.env.AGENT_CHECKSUM_SHA256 ?? '',
    mandatory: false,
  };
}
