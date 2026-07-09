-- OpsEdge360 SSO (OIDC / SAML)
-- Version: 013

CREATE TABLE IF NOT EXISTS sso_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    protocol VARCHAR(20) NOT NULL CHECK (protocol IN ('oidc', 'saml')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    -- OIDC
    issuer VARCHAR(500),
    client_id VARCHAR(255),
    client_secret VARCHAR(500),
    scopes VARCHAR(255) DEFAULT 'openid email profile',
    -- SAML
    entry_point VARCHAR(500),
    idp_entity_id VARCHAR(500),
    idp_cert TEXT,
    -- Common
    allowed_domains TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sso_providers_tenant ON sso_providers(tenant_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_subject VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS sso_provider_id UUID REFERENCES sso_providers(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sso_subject
  ON users(tenant_id, sso_provider_id, sso_subject)
  WHERE sso_subject IS NOT NULL;
