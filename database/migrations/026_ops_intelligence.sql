-- 026_ops_intelligence.sql
-- Phase 3 Wave 5 — Operations Intelligence foundations

CREATE TABLE IF NOT EXISTS ops_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  primary_ci_id UUID REFERENCES configuration_items(id) ON DELETE SET NULL,
  signal_counts JSONB NOT NULL DEFAULT '{}',
  blast_summary JSONB NOT NULL DEFAULT '{}',
  correlation_key VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_incidents_tenant_status
  ON ops_incidents (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_incidents_corr
  ON ops_incidents (tenant_id, correlation_key);

CREATE TABLE IF NOT EXISTS ops_incident_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES ops_incidents(id) ON DELETE CASCADE,
  source_type VARCHAR(40) NOT NULL,
  source_id UUID NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1,
  title TEXT,
  severity VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (incident_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_incident_members_inc
  ON ops_incident_members (tenant_id, incident_id);

CREATE TABLE IF NOT EXISTS ops_incident_ci_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES ops_incidents(id) ON DELETE CASCADE,
  ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  link_reason VARCHAR(40) NOT NULL DEFAULT 'name_match',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (incident_id, ci_id, link_reason)
);

CREATE TABLE IF NOT EXISTS rca_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES ops_incidents(id) ON DELETE SET NULL,
  ci_id UUID REFERENCES configuration_items(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  evidence JSONB NOT NULL DEFAULT '{}',
  summary TEXT,
  confidence_pct SMALLINT NOT NULL DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rca_sessions_tenant
  ON rca_sessions (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rca_hypotheses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES rca_sessions(id) ON DELETE CASCADE,
  rank INT NOT NULL DEFAULT 1,
  hypothesis TEXT NOT NULL,
  supporting_evidence JSONB NOT NULL DEFAULT '{}',
  confidence_pct SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rca_hypotheses_session
  ON rca_hypotheses (session_id, rank);

CREATE TABLE IF NOT EXISTS metric_baselines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_name VARCHAR(200) NOT NULL,
  ci_id UUID REFERENCES configuration_items(id) ON DELETE SET NULL,
  window_minutes INT NOT NULL DEFAULT 60,
  mean_value DOUBLE PRECISION NOT NULL DEFAULT 0,
  stddev_value DOUBLE PRECISION NOT NULL DEFAULT 0,
  sample_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, metric_name, window_minutes)
);

CREATE INDEX IF NOT EXISTS idx_metric_baselines_tenant
  ON metric_baselines (tenant_id, metric_name);

CREATE TABLE IF NOT EXISTS ops_intelligence_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  signal_type VARCHAR(64) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  ref_id UUID,
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_signals_tenant
  ON ops_intelligence_signals (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ops_remediation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES ops_incidents(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  risk_tier VARCHAR(20) NOT NULL DEFAULT 'medium',
  evidence TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  execution_mode VARCHAR(20) NOT NULL DEFAULT 'dry_run',
  execution_result JSONB,
  requested_by VARCHAR(255),
  resolved_by VARCHAR(255),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ops_remediation_tenant
  ON ops_remediation_requests (tenant_id, status, requested_at DESC);

ALTER TABLE anomalies
  ADD COLUMN IF NOT EXISTS source VARCHAR(40) DEFAULT 'manual';

ALTER TABLE predictive_forecasts
  ADD COLUMN IF NOT EXISTS source VARCHAR(40) DEFAULT 'analytics';
