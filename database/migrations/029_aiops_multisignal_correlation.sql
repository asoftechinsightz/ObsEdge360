-- 029_aiops_multisignal_correlation.sql
-- Phase 4 Wave 2 — Advanced multi-signal correlation

ALTER TABLE aiops_correlation_events
  ADD COLUMN IF NOT EXISTS window_minutes INT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS signal_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_service VARCHAR(255),
  ADD COLUMN IF NOT EXISTS primary_ci_id UUID,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS aiops_correlation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  correlation_id UUID NOT NULL REFERENCES aiops_correlation_events(id) ON DELETE CASCADE,
  signal_type VARCHAR(40) NOT NULL,
  source_id VARCHAR(255),
  title TEXT,
  severity VARCHAR(20),
  service_name VARCHAR(255),
  weight DOUBLE PRECISION NOT NULL DEFAULT 1,
  occurred_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aiops_corr_members_corr
  ON aiops_correlation_members (tenant_id, correlation_id);

CREATE TABLE IF NOT EXISTS aiops_signal_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  window_minutes INT NOT NULL DEFAULT 30,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics_count INT NOT NULL DEFAULT 0,
  logs_count INT NOT NULL DEFAULT 0,
  traces_count INT NOT NULL DEFAULT 0,
  alerts_count INT NOT NULL DEFAULT 0,
  anomalies_count INT NOT NULL DEFAULT 0,
  changes_count INT NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_aiops_signal_snap_tenant
  ON aiops_signal_snapshots (tenant_id, collected_at DESC);
