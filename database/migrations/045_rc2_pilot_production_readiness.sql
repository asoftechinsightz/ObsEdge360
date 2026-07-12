-- 045_rc2_pilot_production_readiness.sql
-- RC2: production TOTP MFA, backup codes, login history, security alerts, benchmarks, pilot readiness
-- Additive only.

INSERT INTO feature_flags (tenant_id, flag_key, enabled, payload)
SELECT NULL, f.key, f.enabled, f.payload::jsonb
FROM (VALUES
  ('mfa.totp_rfc6238', true, '{}'),
  ('mfa.backup_codes', true, '{}'),
  ('security.login_history', true, '{}'),
  ('security.session_revoke', true, '{}'),
  ('demo.reset', true, '{}'),
  ('rc2.pilot_readiness', true, '{}')
) AS f(key, enabled, payload)
WHERE NOT EXISTS (SELECT 1 FROM feature_flags ff WHERE ff.tenant_id IS NULL AND ff.flag_key = f.key);

-- MFA backup codes (hashed at rest)
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(128) NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mfa_backup_user ON mfa_backup_codes(user_id) WHERE used_at IS NULL;

-- Login history / security events
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(320),
  event VARCHAR(32) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address VARCHAR(64),
  user_agent TEXT,
  risk_score INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT login_history_event_chk CHECK (
    event IN ('login','login_failed','logout','mfa_success','mfa_failed','session_revoke','password_change','token_create','token_revoke','backup_code_used')
  )
);
CREATE INDEX IF NOT EXISTS idx_login_history_tenant ON login_history(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id, created_at DESC);

-- Security alerts: reuse existing security_alerts from 020_security_observability.sql
-- (title, severity, status, summary). Do not recreate.

-- Password rotation tracking (policy already in wave6; this records due/rotated)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_must_rotate BOOLEAN NOT NULL DEFAULT false;

-- Demo reset runs
CREATE TABLE IF NOT EXISTS demo_reset_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance benchmark runs (lab / staging)
CREATE TABLE IF NOT EXISTS performance_benchmark_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  profile_name VARCHAR(64) NOT NULL,
  concurrent_users INT NOT NULL,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  passed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RC2 readiness / pilot sign-off
CREATE TABLE IF NOT EXISTS rc2_readiness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(64) NOT NULL DEFAULT 'v1.0.0-rc2-pilot',
  status VARCHAR(32) NOT NULL DEFAULT 'prepared',
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  security JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance JSONB NOT NULL DEFAULT '{}'::jsonb,
  audit_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  production_sha VARCHAR(64),
  validation_token VARCHAR(64),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rc2_status_chk CHECK (
    status IN ('prepared','validated','approved','released','superseded')
  )
);

INSERT INTO rc2_readiness (version, status, checklist)
SELECT 'v1.0.0-rc2-pilot', 'prepared',
  '{"audit":true,"quality":true,"performance":true,"security":true,"deployment":true,"demo":true,"docs":true,"branding":true,"debt":true,"pilot":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM rc2_readiness WHERE version='v1.0.0-rc2-pilot');

-- API token lifecycle extras
ALTER TABLE api_access_tokens ADD COLUMN IF NOT EXISTS rotated_from UUID;
ALTER TABLE api_access_tokens ADD COLUMN IF NOT EXISTS note TEXT;
