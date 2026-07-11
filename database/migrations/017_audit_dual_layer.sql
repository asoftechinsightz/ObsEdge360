-- 017: Wave 3 Audit dual-layer — outbox queue, evidence store, retention, legal hold
CREATE TABLE IF NOT EXISTS audit_evidence_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_outbox_pending
  ON audit_evidence_outbox (available_at)
  WHERE processed_at IS NULL;

CREATE TABLE IF NOT EXISTS audit_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  event_category VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  schema_version VARCHAR(20) NOT NULL DEFAULT '1.1',
  retained_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_tenant_time
  ON audit_evidence (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_category
  ON audit_evidence (tenant_id, event_category);

CREATE TABLE IF NOT EXISTS audit_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  retention_class VARCHAR(50) NOT NULL,
  retention_days INTEGER NOT NULL,
  applies_to VARCHAR(20) NOT NULL DEFAULT 'both',
  metadata JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_retention_global
  ON audit_retention_policies (retention_class) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_retention_tenant
  ON audit_retention_policies (tenant_id, retention_class) WHERE tenant_id IS NOT NULL;

INSERT INTO audit_retention_policies (tenant_id, retention_class, retention_days, applies_to)
SELECT NULL, v.cls, v.days, v.applies
FROM (VALUES
  ('operational', 90, 'l1'),
  ('security', 365, 'l2'),
  ('compliance', 2555, 'l2'),
  ('financial', 2555, 'l2')
) AS v(cls, days, applies)
WHERE NOT EXISTS (
  SELECT 1 FROM audit_retention_policies p WHERE p.tenant_id IS NULL AND p.retention_class = v.cls
);

CREATE TABLE IF NOT EXISTS audit_legal_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_by UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_legal_holds_active
  ON audit_legal_holds (tenant_id)
  WHERE active = true;

-- Enrich operational audit_logs for schema v1.1 search helpers
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS schema_version VARCHAR(20) DEFAULT '1.1';
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_event_id ON audit_logs (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (tenant_id, action);
