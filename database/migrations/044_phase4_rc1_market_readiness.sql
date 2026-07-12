-- 044_phase4_rc1_market_readiness.sql
-- Phase 4 RC1: MFA enforcement, commercial readiness, demo tour, RC1 sign-off
-- Additive only.

INSERT INTO feature_flags (tenant_id, flag_key, enabled, payload)
SELECT NULL, f.key, f.enabled, f.payload::jsonb
FROM (VALUES
  ('mfa.enforcement', true, '{"default":"optional"}'),
  ('commercial.trial', true, '{}'),
  ('demo.presentation_mode', true, '{}'),
  ('ux.eig_theme', true, '{}'),
  ('rc1.readiness', true, '{}')
) AS f(key, enabled, payload)
WHERE NOT EXISTS (SELECT 1 FROM feature_flags ff WHERE ff.tenant_id IS NULL AND ff.flag_key = f.key);

-- Tenant MFA policy
CREATE TABLE IF NOT EXISTS mfa_policies (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  mode VARCHAR(32) NOT NULL DEFAULT 'optional',
  grace_days INT NOT NULL DEFAULT 14,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mfa_policies_mode_chk CHECK (mode IN ('off','optional','required'))
);

-- Extend MFA factors with secret material for TOTP enrollment (encrypted at rest preferred; store hashed secret)
ALTER TABLE mfa_factors ADD COLUMN IF NOT EXISTS secret_enc TEXT;
ALTER TABLE mfa_factors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Commercial subscriptions / trials
CREATE TABLE IF NOT EXISTS commercial_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_code VARCHAR(64) NOT NULL DEFAULT 'enterprise',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  trial BOOLEAN NOT NULL DEFAULT false,
  seats INT,
  entitlements JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commercial_sub_status_chk CHECK (
    status IN ('trial','active','past_due','cancelled','expired')
  )
);
CREATE INDEX IF NOT EXISTS idx_commercial_subs_tenant ON commercial_subscriptions(tenant_id, status);

CREATE TABLE IF NOT EXISTS commercial_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric VARCHAR(64) NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Demo evaluation / guided tour
CREATE TABLE IF NOT EXISTS demo_tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  industry VARCHAR(64),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO demo_tours (code, title, industry, steps)
SELECT v.code, v.title, v.industry, v.steps::jsonb
FROM (VALUES
  ('banking-exec', 'Banking Executive Walkthrough', 'banking',
   '[{"path":"/dashboard","title":"Executive Home"},{"path":"/banking360","title":"Banking360"},{"path":"/synthetics","title":"Synthetics"},{"path":"/itsm","title":"ITSM"},{"path":"/reports","title":"Reports"}]'),
  ('healthcare-ops', 'Healthcare Operations Tour', 'healthcare',
   '[{"path":"/dashboard","title":"Executive Home"},{"path":"/ops-intelligence","title":"Ops Intelligence"},{"path":"/compliance","title":"Compliance"},{"path":"/reports","title":"Reports"}]'),
  ('manufacturing-ot', 'Manufacturing OT Tour', 'manufacturing',
   '[{"path":"/ot","title":"OT / Industrial"},{"path":"/topology","title":"Topology"},{"path":"/synthetics","title":"Synthetics"}]'),
  ('retail-cx', 'Retail Customer Experience', 'retail',
   '[{"path":"/transactions","title":"Transactions"},{"path":"/apm","title":"APM"},{"path":"/synthetics","title":"Synthetics"}]'),
  ('government-compliance', 'Government Compliance Tour', 'government',
   '[{"path":"/compliance","title":"Compliance"},{"path":"/governance","title":"Governance"},{"path":"/admin/audit","title":"Audit"}]')
) AS v(code, title, industry, steps)
WHERE NOT EXISTS (SELECT 1 FROM demo_tours d WHERE d.code = v.code);

CREATE TABLE IF NOT EXISTS demo_tour_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tour_code VARCHAR(64) NOT NULL,
  step_index INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RC1 readiness / sign-off
CREATE TABLE IF NOT EXISTS rc1_readiness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(64) NOT NULL DEFAULT 'v1.0.0-rc1-market',
  status VARCHAR(32) NOT NULL DEFAULT 'prepared',
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  security JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance JSONB NOT NULL DEFAULT '{}'::jsonb,
  scalability JSONB NOT NULL DEFAULT '{}'::jsonb,
  documentation JSONB NOT NULL DEFAULT '{}'::jsonb,
  known_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  production_sha VARCHAR(64),
  validation_token VARCHAR(64),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rc1_status_chk CHECK (
    status IN ('prepared','validated','approved','released','superseded')
  )
);

INSERT INTO rc1_readiness (version, status, checklist, known_issues)
SELECT 'v1.0.0-rc1-market', 'prepared',
  '{"ux":true,"security":true,"ha":true,"deployment":true,"integrations":true,"reporting":true,"docs":true,"demo":true,"commercial":true,"qe":true}'::jsonb,
  '["Browser synthetics Chromium worker remains optional behind browser-sim engine","MFA TOTP enrollment available; hardware WebAuthn deferred","Full multi-region active-active DR is operator-validated via Wave7/HA drills"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM rc1_readiness WHERE version='v1.0.0-rc1-market');

-- API tokens (user-facing management on top of api_keys if present)
CREATE TABLE IF NOT EXISTS api_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  token_prefix VARCHAR(16) NOT NULL,
  token_hash VARCHAR(128) NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_access_tokens_tenant ON api_access_tokens(tenant_id);

-- Security headers attestation log
CREATE TABLE IF NOT EXISTS security_header_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  owasp_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  passed BOOLEAN NOT NULL DEFAULT true
);
