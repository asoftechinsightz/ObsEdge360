-- Phase 3 Wave 1: Telemetry Platform (migration 022)

CREATE TABLE IF NOT EXISTS telemetry_collectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  collector_type VARCHAR(50) NOT NULL DEFAULT 'otelcol',
  endpoint TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_heartbeat_at TIMESTAMPTZ,
  version VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_collectors_tenant
  ON telemetry_collectors (tenant_id, status);

CREATE TABLE IF NOT EXISTS telemetry_ingest_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  signal VARCHAR(20) NOT NULL CHECK (signal IN ('metrics', 'logs', 'traces')),
  window_start TIMESTAMPTZ NOT NULL,
  accepted INT NOT NULL DEFAULT 0,
  rejected INT NOT NULL DEFAULT 0,
  bytes_in BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, signal, window_start)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_ingest_stats_tenant
  ON telemetry_ingest_stats (tenant_id, window_start DESC);

CREATE TABLE IF NOT EXISTS telemetry_quality_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  signal VARCHAR(20) NOT NULL,
  reason VARCHAR(200) NOT NULL,
  sample JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_quality_tenant
  ON telemetry_quality_events (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS telemetry_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  signal VARCHAR(20) NOT NULL CHECK (signal IN ('metrics', 'logs', 'traces', 'all')),
  retention_days INT NOT NULL CHECK (retention_days >= 1),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_telemetry_retention_global
  ON telemetry_retention_policies (signal) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_telemetry_retention_tenant
  ON telemetry_retention_policies (tenant_id, signal) WHERE tenant_id IS NOT NULL;

INSERT INTO telemetry_retention_policies (tenant_id, signal, retention_days, enabled)
SELECT NULL, v.signal, v.days, true
FROM (VALUES
  ('metrics', 30),
  ('logs', 14),
  ('traces', 7)
) AS v(signal, days)
WHERE NOT EXISTS (
  SELECT 1 FROM telemetry_retention_policies p
  WHERE p.tenant_id IS NULL AND p.signal = v.signal
);
