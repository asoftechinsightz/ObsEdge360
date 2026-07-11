-- 031_controlled_remediation.sql
-- Phase 4 Wave 4 — Intelligent remediation (controlled execution)

ALTER TABLE ops_remediation_requests
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS action_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS policy_version VARCHAR(40) NOT NULL DEFAULT 'remediation-v1',
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS remediation_action_catalog (
  action_key VARCHAR(100) PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  risk_tier VARCHAR(20) NOT NULL DEFAULT 'medium',
  live_allowed BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remediation_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES ops_remediation_requests(id) ON DELETE CASCADE,
  event_type VARCHAR(40) NOT NULL,
  actor VARCHAR(255),
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remediation_audit_tenant
  ON remediation_audit_events (tenant_id, request_id, created_at DESC);

INSERT INTO remediation_action_catalog (action_key, display_name, risk_tier, live_allowed, description)
VALUES
  ('restart_service', 'Restart service', 'medium', true, 'Controlled restart via allowlisted adapter'),
  ('scale_replicas', 'Scale replicas', 'medium', true, 'Scale deployment replicas within policy bounds'),
  ('clear_cache', 'Clear cache', 'low', true, 'Flush application cache'),
  ('rotate_connection_pool', 'Rotate connection pool', 'medium', true, 'Recycle DB/connection pool'),
  ('notify_oncall', 'Notify on-call', 'low', true, 'Page/notify on-call channel'),
  ('investigate_stabilize', 'Investigate and stabilize', 'medium', false, 'Generic investigate action (dry-run only by default)'),
  ('rollback_deploy', 'Rollback deployment', 'high', false, 'High-risk rollback — approval required; live disabled until adapter certified')
ON CONFLICT (action_key) DO NOTHING;
