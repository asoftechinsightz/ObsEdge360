-- 043_phase3_enterprise_excellence.sql
-- Phase 3: AI Copilot sessions, browser synthetics, ITSM depth, reporting, marketplace, MFA readiness, Banking360 monitors
-- Additive only.

-- Feature flag seeds for Phase 3
INSERT INTO feature_flags (tenant_id, flag_key, enabled, payload)
SELECT NULL, f.key, f.enabled, f.payload::jsonb
FROM (VALUES
  ('synthetics.browser', true, '{"phase":"B"}'),
  ('ux.light_theme', true, '{}'),
  ('ux.notifications', true, '{}'),
  ('copilot.structured', true, '{}'),
  ('reporting.executive', true, '{}'),
  ('marketplace.registry', true, '{}'),
  ('banking360.payment_monitors', true, '{}'),
  ('mfa.framework', true, '{"enforced":false}')
) AS f(key, enabled, payload)
WHERE NOT EXISTS (SELECT 1 FROM feature_flags ff WHERE ff.tenant_id IS NULL AND ff.flag_key = f.key);

-- User preferences / theme
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  theme VARCHAR(16) NOT NULL DEFAULT 'dark',
  landing_path VARCHAR(255),
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id),
  CONSTRAINT user_preferences_theme_chk CHECK (theme IN ('dark','light','system'))
);

-- In-app notification center
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  severity VARCHAR(16) NOT NULL DEFAULT 'info',
  title VARCHAR(512) NOT NULL,
  body TEXT,
  href VARCHAR(512),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, created_at DESC);

-- Copilot structured sessions
CREATE TABLE IF NOT EXISTS copilot_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  title VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS copilot_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES copilot_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL,
  content TEXT NOT NULL,
  structured JSONB NOT NULL DEFAULT '{}'::jsonb,
  sources TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Browser synthetics (Phase B)
CREATE TABLE IF NOT EXISTS synthetic_browser_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  base_url VARCHAR(1024) NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule_cron VARCHAR(64),
  enabled BOOLEAN NOT NULL DEFAULT true,
  capture_screenshot BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] NOT NULL DEFAULT ARRAY['browser','synthetic']::TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS synthetic_browser_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES synthetic_browser_journeys(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL,
  duration_ms INT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  waterfall JSONB NOT NULL DEFAULT '[]'::jsonb,
  screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  CONSTRAINT synthetic_browser_runs_status_chk CHECK (status IN ('ok','fail','error','timeout','skipped'))
);
CREATE INDEX IF NOT EXISTS idx_synthetic_browser_runs_journey ON synthetic_browser_runs(journey_id, started_at DESC);

-- ITSM depth
CREATE TABLE IF NOT EXISTS itsm_cab_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  change_id UUID NOT NULL REFERENCES itsm_changes(id) ON DELETE CASCADE,
  approver_role VARCHAR(64) NOT NULL DEFAULT 'cab',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  comment TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT itsm_cab_status_chk CHECK (status IN ('pending','approved','rejected'))
);

CREATE TABLE IF NOT EXISTS itsm_sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_pct NUMERIC(5,2) NOT NULL DEFAULT 99.90,
  metric VARCHAR(64) NOT NULL DEFAULT 'availability',
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ci_id UUID REFERENCES configuration_items(id) ON DELETE SET NULL,
  asset_tag VARCHAR(128),
  lifecycle_state VARCHAR(32) NOT NULL DEFAULT 'in_service',
  owner VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT itsm_assets_lifecycle_chk CHECK (
    lifecycle_state IN ('ordered','received','in_service','maintenance','retired','disposed')
  )
);

-- Executive reporting
CREATE TABLE IF NOT EXISTS executive_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  format VARCHAR(16) NOT NULL DEFAULT 'json',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT executive_reports_type_chk CHECK (
    report_type IN (
      'sla_compliance','availability','incident_trends','mttr','capacity',
      'synthetics','executive_summary','compliance','audit'
    )
  )
);

CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type VARCHAR(64) NOT NULL,
  cron VARCHAR(64) NOT NULL DEFAULT '0 8 * * 1',
  channel VARCHAR(32) NOT NULL DEFAULT 'in_app',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marketplace foundation
CREATE TABLE IF NOT EXISTS marketplace_extensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  extension_key VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  version VARCHAR(32) NOT NULL DEFAULT '0.1.0',
  status VARCHAR(32) NOT NULL DEFAULT 'registered',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marketplace_kind_chk CHECK (kind IN ('plugin','connector','pack','agent')),
  CONSTRAINT marketplace_status_chk CHECK (status IN ('registered','installed','disabled','deprecated'))
);

INSERT INTO marketplace_extensions (extension_key, name, kind, version, status, permissions, manifest)
SELECT * FROM (VALUES
  ('opsedge.synthetics.browser', 'Browser Synthetics', 'plugin', '0.1.0', 'registered', '["synthetics:write"]'::jsonb, '{"phase":3}'::jsonb),
  ('opsedge.itsm.core', 'ITSM Core', 'plugin', '0.1.0', 'registered', '["itsm:write"]'::jsonb, '{"phase":3}'::jsonb),
  ('opsedge.reporting.executive', 'Executive Reporting', 'plugin', '0.1.0', 'registered', '["reports:read"]'::jsonb, '{"phase":3}'::jsonb),
  ('opsedge.banking360.payments', 'Banking360 Payment Monitors', 'pack', '0.1.0', 'registered', '["banking360:read"]'::jsonb, '{"phase":3}'::jsonb)
) AS v(extension_key, name, kind, version, status, permissions, manifest)
WHERE NOT EXISTS (SELECT 1 FROM marketplace_extensions m WHERE m.extension_key = v.extension_key);

-- MFA readiness (framework only — not enforced)
CREATE TABLE IF NOT EXISTS mfa_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  factor_type VARCHAR(32) NOT NULL DEFAULT 'totp',
  status VARCHAR(32) NOT NULL DEFAULT 'unenrolled',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mfa_factors_type_chk CHECK (factor_type IN ('totp','webauthn','email_otp')),
  CONSTRAINT mfa_factors_status_chk CHECK (status IN ('unenrolled','pending','active','disabled'))
);

-- Banking360 payment monitoring framework (generic rails)
CREATE TABLE IF NOT EXISTS banking360_payment_monitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rail VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  target VARCHAR(1024),
  enabled BOOLEAN NOT NULL DEFAULT true,
  slo_target_ms INT NOT NULL DEFAULT 2000,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT banking360_rail_chk CHECK (
    rail IN ('upi','imps','neft','rtgs','atm','cbs','api','payment_switch','fraud')
  )
);

CREATE TABLE IF NOT EXISTS banking360_payment_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitor_id UUID NOT NULL REFERENCES banking360_payment_monitors(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL,
  latency_ms INT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved views
CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  resource VARCHAR(64) NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
