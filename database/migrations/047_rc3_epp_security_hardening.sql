-- 047_rc3_epp_security_hardening.sql
-- RC3 / EPP: MFA secret encryption metadata + session JWT binding (jti)

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS jti VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_jti ON user_sessions(jti) WHERE jti IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_jti_active ON user_sessions(jti) WHERE revoked_at IS NULL;

-- Optional metadata for encrypted MFA secrets (envelope may also live in secret_enc)
ALTER TABLE mfa_factors ADD COLUMN IF NOT EXISTS secret_key_id VARCHAR(64);
ALTER TABLE mfa_factors ADD COLUMN IF NOT EXISTS secret_alg VARCHAR(32);

INSERT INTO feature_flags (tenant_id, flag_key, enabled, payload)
SELECT NULL, f.key, f.enabled, f.payload::jsonb
FROM (VALUES
  ('security.mfa_secret_encrypt', true, '{}'),
  ('security.jwt_session_bind', true, '{}'),
  ('rc3.epp_readiness', true, '{}')
) AS f(key, enabled, payload)
WHERE NOT EXISTS (SELECT 1 FROM feature_flags ff WHERE ff.tenant_id IS NULL AND ff.flag_key = f.key);

CREATE TABLE IF NOT EXISTS rc3_readiness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(64) NOT NULL UNIQUE DEFAULT 'v1.0.0-rc3-epp',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  production_sha VARCHAR(64),
  validation_token VARCHAR(128),
  security JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance JSONB NOT NULL DEFAULT '{}'::jsonb,
  audit_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO rc3_readiness (version, status)
SELECT 'v1.0.0-rc3-epp', 'pending'
WHERE NOT EXISTS (SELECT 1 FROM rc3_readiness WHERE version = 'v1.0.0-rc3-epp');
