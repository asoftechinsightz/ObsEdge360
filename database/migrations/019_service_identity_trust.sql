-- 019: Service identity, credentials, certificate registry (Wave 5)
CREATE TABLE IF NOT EXISTS service_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  kind VARCHAR(50) NOT NULL DEFAULT 'service',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  scopes TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_identities_tenant_name
  ON service_identities (tenant_id, name) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_service_identities_platform_name
  ON service_identities (name) WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_service_identities_tenant ON service_identities (tenant_id, status);

CREATE TABLE IF NOT EXISTS service_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES service_identities(id) ON DELETE CASCADE,
  credential_type VARCHAR(50) NOT NULL DEFAULT 'jwt_key',
  key_hash VARCHAR(128),
  kid VARCHAR(100),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trust_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  identity_id UUID REFERENCES service_identities(id) ON DELETE SET NULL,
  subject_cn VARCHAR(255) NOT NULL,
  fingerprint_sha256 VARCHAR(64) NOT NULL,
  not_before TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  not_after TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  pem_public TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fingerprint_sha256)
);

CREATE INDEX IF NOT EXISTS idx_trust_certs_tenant ON trust_certificates (tenant_id, status);
