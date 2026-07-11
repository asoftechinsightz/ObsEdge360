-- 035_platform_governance.sql — Phase 5 Wave 3 platform ops & governance metadata

CREATE TABLE IF NOT EXISTS platform_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_key VARCHAR(64) NOT NULL,
  soft_limit BIGINT,
  hard_limit BIGINT,
  warn_pct INTEGER NOT NULL DEFAULT 80,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, resource_key)
);
CREATE INDEX IF NOT EXISTS idx_platform_quotas_tenant ON platform_quotas(tenant_id);

CREATE TABLE IF NOT EXISTS security_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  policy_type VARCHAR(64) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, policy_type)
);

CREATE TABLE IF NOT EXISTS capacity_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  scope VARCHAR(32) NOT NULL DEFAULT 'platform',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_capacity_snapshots_created ON capacity_snapshots(created_at DESC);

CREATE TABLE IF NOT EXISTS storage_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  scope VARCHAR(32) NOT NULL DEFAULT 'platform',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_storage_snapshots_created ON storage_snapshots(created_at DESC);

CREATE TABLE IF NOT EXISTS governance_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_id UUID,
  action VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64),
  resource_id VARCHAR(128),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_governance_audit_tenant ON governance_audit_events(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_lockouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_label VARCHAR(255),
  ip_address VARCHAR(64),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id) WHERE revoked_at IS NULL;

-- Seed default password + session policies for existing tenants (idempotent via ON CONFLICT)
INSERT INTO security_policies (tenant_id, policy_type, config)
SELECT t.id, 'password', jsonb_build_object(
  'minLength', 8,
  'requireComplexity', false,
  'expirationDays', null,
  'historyCount', 0,
  'maxFailedAttempts', 5,
  'lockoutMinutes', 15
)
FROM tenants t
ON CONFLICT (tenant_id, policy_type) DO NOTHING;

INSERT INTO security_policies (tenant_id, policy_type, config)
SELECT t.id, 'session', jsonb_build_object(
  'sessionTimeoutMinutes', 1440,
  'idleTimeoutMinutes', 60,
  'maxConcurrentSessions', 10,
  'deviceTracking', true,
  'forcedLogoutEnabled', true
)
FROM tenants t
ON CONFLICT (tenant_id, policy_type) DO NOTHING;
