-- 042_phase2_enterprise_maturity.sql
-- Phase 2: env isolation metadata, feature flags, synthetics A, demo refresh, industry pack framework, ITSM foundation
-- Additive only. Does not modify Waves 1–9 contracts.

-- Environment registry (logical names: opsedge360_prod|demo|dev|local)
CREATE TABLE IF NOT EXISTS platform_environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) NOT NULL UNIQUE,
  database_name VARCHAR(128) NOT NULL,
  label VARCHAR(128) NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  outbound_disabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_environments_code_chk CHECK (
    code IN ('production','demo','development','local','uat','staging')
  )
);

INSERT INTO platform_environments (code, database_name, label, is_demo, outbound_disabled, config)
VALUES
  ('production', 'opsedge360_prod', 'Production', false, false, '{"alias":"trinetra360"}'::jsonb),
  ('demo', 'opsedge360_demo', 'Demo', true, true, '{"refresh":"nightly"}'::jsonb),
  ('development', 'opsedge360_dev', 'Development', false, false, '{}'::jsonb),
  ('local', 'opsedge360_local', 'Local', false, false, '{}'::jsonb),
  ('uat', 'opsedge360_uat', 'UAT', false, true, '{}'::jsonb),
  ('staging', 'opsedge360_staging', 'Staging', false, false, '{}'::jsonb)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  flag_key VARCHAR(128) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, flag_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_global
  ON feature_flags (flag_key) WHERE tenant_id IS NULL;

INSERT INTO feature_flags (tenant_id, flag_key, enabled, payload)
SELECT NULL, f.key, f.enabled, f.payload::jsonb
FROM (VALUES
  ('synthetics.http', true, '{"phase":"A"}'),
  ('synthetics.browser', false, '{"phase":"B"}'),
  ('demo.banner', true, '{}'),
  ('demo.outbound_kill_switch', true, '{}'),
  ('itsm.problem', true, '{"foundation":true}'),
  ('itsm.change', true, '{"foundation":true}'),
  ('industry.framework', true, '{}'),
  ('ux.command_palette', true, '{}')
) AS f(key, enabled, payload)
WHERE NOT EXISTS (SELECT 1 FROM feature_flags ff WHERE ff.tenant_id IS NULL AND ff.flag_key = f.key);

-- Synthetic monitoring Phase A
CREATE TABLE IF NOT EXISTS synthetic_monitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  monitor_type VARCHAR(32) NOT NULL,
  target VARCHAR(1024) NOT NULL,
  interval_seconds INT NOT NULL DEFAULT 60,
  timeout_ms INT NOT NULL DEFAULT 10000,
  enabled BOOLEAN NOT NULL DEFAULT true,
  locations JSONB NOT NULL DEFAULT '["default"]'::jsonb,
  assertions JSONB NOT NULL DEFAULT '[]'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  method VARCHAR(16) NOT NULL DEFAULT 'GET',
  body TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT synthetic_monitors_type_chk CHECK (
    monitor_type IN ('http','rest','dns','ssl','tcp')
  )
);
CREATE INDEX IF NOT EXISTS idx_synthetic_monitors_tenant ON synthetic_monitors(tenant_id, enabled);

CREATE TABLE IF NOT EXISTS synthetic_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitor_id UUID NOT NULL REFERENCES synthetic_monitors(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL,
  latency_ms INT,
  status_code INT,
  dns_ms INT,
  tcp_ms INT,
  tls_days_remaining INT,
  message TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT synthetic_results_status_chk CHECK (status IN ('ok','fail','error','timeout'))
);
CREATE INDEX IF NOT EXISTS idx_synthetic_results_monitor ON synthetic_results(monitor_id, checked_at DESC);

-- Demo refresh / org catalog
CREATE TABLE IF NOT EXISTS demo_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  industry VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'ready',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO demo_organizations (industry, name, slug, metadata)
SELECT * FROM (VALUES
  ('banking', 'Asoftech National Bank', 'demo-banking', '{"region":"APAC"}'::text),
  ('healthcare', 'Insightz Health Systems', 'demo-healthcare', '{"region":"APAC"}'::text),
  ('manufacturing', 'EdgeForge Industries', 'demo-manufacturing', '{"region":"EMEA"}'::text),
  ('retail', 'OmniCart Retail Group', 'demo-retail', '{"region":"AMER"}'::text)
) AS v(industry, name, slug, metadata)
WHERE NOT EXISTS (SELECT 1 FROM demo_organizations d WHERE d.slug = v.slug);

CREATE TABLE IF NOT EXISTS demo_refresh_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  environment_code VARCHAR(32) NOT NULL DEFAULT 'demo',
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  records_seeded INT NOT NULL DEFAULT 0,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Industry pack framework (extensible; packs not fully implemented yet)
CREATE TABLE IF NOT EXISTS industry_pack_framework (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'planned',
  schema_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT industry_pack_fw_status_chk CHECK (
    status IN ('active','planned','preview','deprecated')
  )
);

INSERT INTO industry_pack_framework (code, title, status, capabilities)
SELECT * FROM (VALUES
  ('banking360', 'Banking360', 'active', '["compliance","payments","dashboards"]'::text),
  ('healthcare360', 'Healthcare360', 'planned', '["hipaa","clinical-ops"]'::text),
  ('manufacturing360', 'Manufacturing360', 'planned', '["ot","oee"]'::text),
  ('retail360', 'Retail360', 'planned', '["pos","omnichannel"]'::text),
  ('government360', 'Government360', 'planned', '["citizen","compliance"]'::text),
  ('telecom360', 'Telecom360', 'planned', '["network","oss-bss"]'::text),
  ('cloud360', 'Cloud360', 'planned', '["multi-cloud","finops"]'::text)
) AS v(code, title, status, capabilities)
WHERE NOT EXISTS (SELECT 1 FROM industry_pack_framework i WHERE i.code = v.code);

-- ITSM foundation (compatible with CMDB; lifecycle depth comes later)
CREATE TABLE IF NOT EXISTS itsm_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number VARCHAR(64) NOT NULL,
  title VARCHAR(512) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  root_cause TEXT,
  related_ci_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, number)
);

CREATE TABLE IF NOT EXISTS itsm_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number VARCHAR(64) NOT NULL,
  title VARCHAR(512) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  risk VARCHAR(16) NOT NULL DEFAULT 'medium',
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  cab_required BOOLEAN NOT NULL DEFAULT true,
  related_ci_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, number)
);

CREATE TABLE IF NOT EXISTS itsm_maintenance_windows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm_knowledge_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(512) NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itsm_service_catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(128),
  enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
