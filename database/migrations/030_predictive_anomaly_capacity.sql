-- 030_predictive_anomaly_capacity.sql
-- Phase 4 Wave 3 — Predictive anomaly + capacity forecasting

ALTER TABLE anomalies
  ADD COLUMN IF NOT EXISTS model_version VARCHAR(50) DEFAULT 'ops_scan',
  ADD COLUMN IF NOT EXISTS expected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prediction_horizon_hours INT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

ALTER TABLE predictive_forecasts
  ADD COLUMN IF NOT EXISTS capacity_threshold DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS breach_eta TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS residual_rmse DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lookback_hours INT DEFAULT 24;

ALTER TABLE metric_baselines
  ADD COLUMN IF NOT EXISTS ewma_value DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS residual_rmse DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS method VARCHAR(40) DEFAULT 'rolling_sigma';

CREATE TABLE IF NOT EXISTS capacity_forecast_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  horizon_hours INT NOT NULL DEFAULT 168,
  metrics_scanned INT NOT NULL DEFAULT 0,
  forecasts_created INT NOT NULL DEFAULT 0,
  breaches_predicted INT NOT NULL DEFAULT 0,
  anomalies_created INT NOT NULL DEFAULT 0,
  model_version VARCHAR(50) NOT NULL DEFAULT 'capacity-v1',
  summary JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capacity_runs_tenant
  ON capacity_forecast_runs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forecasts_breach_eta
  ON predictive_forecasts (tenant_id, breach_eta)
  WHERE breach_eta IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_anomalies_model
  ON anomalies (tenant_id, model_version, detected_at DESC);
