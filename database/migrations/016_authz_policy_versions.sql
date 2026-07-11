-- 016: AuthZ policy versioning metadata (Wave 2)
CREATE TABLE IF NOT EXISTS authz_policy_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  policy_key VARCHAR(200) NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT '1.0',
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deprecated_at TIMESTAMPTZ,
  replacement_policy_key VARCHAR(200),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, policy_key, version)
);

CREATE INDEX IF NOT EXISTS idx_authz_policy_versions_tenant
  ON authz_policy_versions (tenant_id, policy_key);
