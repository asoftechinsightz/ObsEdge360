-- 018: Enterprise secrets store (Wave 4)
CREATE TABLE IF NOT EXISTS secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  provider VARCHAR(50) NOT NULL DEFAULT 'local',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  current_version INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  rotate_after_days INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_secrets_tenant_status ON secrets (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_secrets_expires ON secrets (expires_at) WHERE expires_at IS NOT NULL AND status = 'active';

CREATE TABLE IF NOT EXISTS secret_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secret_id UUID NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  ciphertext TEXT NOT NULL,
  nonce TEXT NOT NULL,
  key_id VARCHAR(100) NOT NULL DEFAULT 'local-v1',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ,
  UNIQUE (secret_id, version)
);

CREATE INDEX IF NOT EXISTS idx_secret_versions_secret ON secret_versions (secret_id, version DESC);
