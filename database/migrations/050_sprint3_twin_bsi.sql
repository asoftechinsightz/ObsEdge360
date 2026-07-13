-- Sprint 3 — Enterprise Digital Twin & Business Service Intelligence
-- Extends business_services with modeling metadata + health/SLA snapshots for time-travel MVP.

ALTER TABLE business_services
  ADD COLUMN IF NOT EXISTS business_unit VARCHAR(120),
  ADD COLUMN IF NOT EXISTS business_capability VARCHAR(120),
  ADD COLUMN IF NOT EXISTS environment VARCHAR(40) DEFAULT 'Prod',
  ADD COLUMN IF NOT EXISTS criticality VARCHAR(40) DEFAULT 'tier2',
  ADD COLUMN IF NOT EXISTS cost_center VARCHAR(80),
  ADD COLUMN IF NOT EXISTS lifecycle VARCHAR(40) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS technical_owner_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS operations_owner_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS support_team VARCHAR(120),
  ADD COLUMN IF NOT EXISTS escalation_group VARCHAR(120),
  ADD COLUMN IF NOT EXISTS oncall_team VARCHAR(120),
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS twin_service_health_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES business_services(id) ON DELETE CASCADE,
  health_score SMALLINT NOT NULL CHECK (health_score BETWEEN 0 AND 100),
  availability NUMERIC(8,4),
  latency_ms NUMERIC(12,2),
  error_rate NUMERIC(8,4),
  sla_compliance NUMERIC(8,4),
  business_risk VARCHAR(40),
  revenue_at_risk NUMERIC(15,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(40) DEFAULT 'propagation'
);

CREATE INDEX IF NOT EXISTS idx_twin_svc_health_hist
  ON twin_service_health_history (tenant_id, service_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS twin_relationship_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  relationship_id UUID,
  source_ci_id UUID,
  target_ci_id UUID,
  relationship_type VARCHAR(50),
  event_type VARCHAR(40) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twin_rel_hist_tenant_time
  ON twin_relationship_history (tenant_id, recorded_at DESC);
