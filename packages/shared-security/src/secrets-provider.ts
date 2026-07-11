import { query, queryOne } from '@opsedge360/shared-db';
import { encryptSecret, decryptSecret, resolveMasterKey } from './secrets-crypto';
import { incSecurityMetric } from './metrics';

export type SecretProviderName = 'local' | 'env' | 'vault' | 'aws' | 'azure' | 'gcp' | 'k8s';
export type SecretStatus = 'active' | 'disabled' | 'revoked';

export interface SecretRecord {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  provider: string;
  status: SecretStatus;
  current_version: number;
  expires_at: string | null;
  rotate_after_days: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SecretsProvider {
  readonly name: SecretProviderName;
  health(): Promise<{ ok: boolean; detail: string }>;
  create(input: {
    tenantId: string;
    name: string;
    value: string;
    description?: string;
    expiresAt?: string;
    rotateAfterDays?: number;
    actorId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SecretRecord>;
  getMetadata(tenantId: string, secretId: string): Promise<SecretRecord | null>;
  list(tenantId: string): Promise<SecretRecord[]>;
  reveal(tenantId: string, secretId: string): Promise<{ value: string; version: number }>;
  rotate(tenantId: string, secretId: string, newValue: string, actorId?: string): Promise<SecretRecord>;
  disable(tenantId: string, secretId: string): Promise<SecretRecord>;
  revoke(tenantId: string, secretId: string): Promise<SecretRecord>;
  versions(tenantId: string, secretId: string): Promise<Array<{ version: number; created_at: string; disabled_at: string | null }>>;
}

function notConfigured(name: SecretProviderName): SecretsProvider {
  const err = () => {
    throw new Error(`Secrets provider '${name}' is not configured in Wave 4 (stub only)`);
  };
  return {
    name,
    async health() {
      return { ok: false, detail: `${name} stub — not configured` };
    },
    create: async () => err(),
    getMetadata: async () => err(),
    list: async () => err(),
    reveal: async () => err(),
    rotate: async () => err(),
    disable: async () => err(),
    revoke: async () => err(),
    versions: async () => err(),
  };
}

export class LocalEncryptedSecretsProvider implements SecretsProvider {
  readonly name: SecretProviderName = 'local';

  async health() {
    try {
      resolveMasterKey();
      await queryOne('SELECT 1 AS ok');
      return { ok: true, detail: 'local encrypted store ready' };
    } catch (e) {
      return { ok: false, detail: (e as Error).message };
    }
  }

  async create(input: {
    tenantId: string;
    name: string;
    value: string;
    description?: string;
    expiresAt?: string;
    rotateAfterDays?: number;
    actorId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SecretRecord> {
    const enc = encryptSecret(input.value);
    const row = await queryOne<SecretRecord>(
      `INSERT INTO secrets (tenant_id, name, description, provider, status, current_version, expires_at, rotate_after_days, metadata)
       VALUES ($1,$2,$3,'local','active',1,$4,$5,$6)
       RETURNING *`,
      [
        input.tenantId,
        input.name,
        input.description ?? null,
        input.expiresAt ?? null,
        input.rotateAfterDays ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    if (!row) throw new Error('Failed to create secret');
    await query(
      `INSERT INTO secret_versions (secret_id, version, ciphertext, nonce, key_id, created_by)
       VALUES ($1,1,$2,$3,$4,$5)`,
      [row.id, enc.ciphertext, enc.nonce, enc.keyId, input.actorId ?? null],
    );
    return row;
  }

  async getMetadata(tenantId: string, secretId: string) {
    return queryOne<SecretRecord>(`SELECT * FROM secrets WHERE id = $1 AND tenant_id = $2`, [secretId, tenantId]);
  }

  async list(tenantId: string) {
    return query<SecretRecord>(`SELECT * FROM secrets WHERE tenant_id = $1 ORDER BY name ASC`, [tenantId]);
  }

  async reveal(tenantId: string, secretId: string) {
    const meta = await this.getMetadata(tenantId, secretId);
    if (!meta) throw new Error('Secret not found');
    if (meta.status !== 'active') throw new Error(`Secret is ${meta.status}`);
    const ver = await queryOne<{ ciphertext: string; nonce: string; version: number }>(
      `SELECT ciphertext, nonce, version FROM secret_versions
       WHERE secret_id = $1 AND version = $2 AND disabled_at IS NULL`,
      [secretId, meta.current_version],
    );
    if (!ver) throw new Error('Secret version missing');
    return { value: decryptSecret(ver.ciphertext, ver.nonce), version: ver.version };
  }

  async rotate(tenantId: string, secretId: string, newValue: string, actorId?: string) {
    const meta = await this.getMetadata(tenantId, secretId);
    if (!meta) throw new Error('Secret not found');
    if (meta.status === 'revoked') throw new Error('Secret revoked');
    const next = meta.current_version + 1;
    const enc = encryptSecret(newValue);
    await query(
      `INSERT INTO secret_versions (secret_id, version, ciphertext, nonce, key_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [secretId, next, enc.ciphertext, enc.nonce, enc.keyId, actorId ?? null],
    );
    const updated = await queryOne<SecretRecord>(
      `UPDATE secrets SET current_version = $2, status = 'active', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $3 RETURNING *`,
      [secretId, next, tenantId],
    );
    return updated!;
  }

  async disable(tenantId: string, secretId: string) {
    const updated = await queryOne<SecretRecord>(
      `UPDATE secrets SET status = 'disabled', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [secretId, tenantId],
    );
    if (!updated) throw new Error('Secret not found');
    return updated;
  }

  async revoke(tenantId: string, secretId: string) {
    const updated = await queryOne<SecretRecord>(
      `UPDATE secrets SET status = 'revoked', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [secretId, tenantId],
    );
    if (!updated) throw new Error('Secret not found');
    await query(`UPDATE secret_versions SET disabled_at = NOW() WHERE secret_id = $1 AND disabled_at IS NULL`, [
      secretId,
    ]);
    return updated;
  }

  async versions(tenantId: string, secretId: string) {
    const meta = await this.getMetadata(tenantId, secretId);
    if (!meta) throw new Error('Secret not found');
    return query<{ version: number; created_at: string; disabled_at: string | null }>(
      `SELECT version, created_at, disabled_at FROM secret_versions WHERE secret_id = $1 ORDER BY version DESC`,
      [secretId],
    );
  }
}

export class EnvSecretsProvider implements SecretsProvider {
  readonly name: SecretProviderName = 'env';
  private local = new LocalEncryptedSecretsProvider();

  async health() {
    return { ok: true, detail: 'env bridge available' };
  }

  create = (input: Parameters<SecretsProvider['create']>[0]) => this.local.create(input);
  getMetadata = (t: string, id: string) => this.local.getMetadata(t, id);
  list = (t: string) => this.local.list(t);
  reveal = async (tenantId: string, secretId: string) => {
    const meta = await this.local.getMetadata(tenantId, secretId);
    const envKey = (meta?.metadata as { envKey?: string } | undefined)?.envKey;
    if (envKey && process.env[envKey]) {
      return { value: process.env[envKey]!, version: meta!.current_version };
    }
    return this.local.reveal(tenantId, secretId);
  };
  rotate = (t: string, id: string, v: string, a?: string) => this.local.rotate(t, id, v, a);
  disable = (t: string, id: string) => this.local.disable(t, id);
  revoke = (t: string, id: string) => this.local.revoke(t, id);
  versions = (t: string, id: string) => this.local.versions(t, id);
}

export function createSecretsProvider(name?: string): SecretsProvider {
  const provider = (name ?? process.env.SECRETS_PROVIDER ?? 'local') as SecretProviderName;
  switch (provider) {
    case 'local':
      return new LocalEncryptedSecretsProvider();
    case 'env':
      return new EnvSecretsProvider();
    case 'vault':
    case 'aws':
    case 'azure':
    case 'gcp':
    case 'k8s':
      return notConfigured(provider);
    default:
      return new LocalEncryptedSecretsProvider();
  }
}

export async function countExpiringSecrets(withinDays = 30): Promise<number> {
  const row = await queryOne<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM secrets
     WHERE status = 'active' AND expires_at IS NOT NULL
       AND expires_at <= NOW() + ($1::text || ' days')::interval`,
    [String(withinDays)],
  );
  return Number(row?.c ?? 0);
}

export { maskSecret, encryptSecret, decryptSecret } from './secrets-crypto';
