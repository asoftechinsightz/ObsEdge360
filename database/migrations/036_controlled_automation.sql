-- 036_controlled_automation.sql — Phase 5 Wave 4 Controlled Automation & Workflow Engine
-- Additive only. No fully autonomous production execution.

-- Extend Wave 1 automation_policies with control modes
ALTER TABLE automation_policies
  ADD COLUMN IF NOT EXISTS control_mode VARCHAR(64) NOT NULL DEFAULT 'approval_required';
ALTER TABLE automation_policies
  ADD COLUMN IF NOT EXISTS environment_scope VARCHAR(64) NOT NULL DEFAULT 'all';
ALTER TABLE automation_policies
  ADD COLUMN IF NOT EXISTS maintenance_windows JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE automation_policies
  ADD COLUMN IF NOT EXISTS max_approval_levels INTEGER NOT NULL DEFAULT 1;
ALTER TABLE automation_policies
  ADD COLUMN IF NOT EXISTS approval_ttl_minutes INTEGER NOT NULL DEFAULT 240;

DO $$ BEGIN
  ALTER TABLE automation_policies DROP CONSTRAINT IF EXISTS automation_policies_control_mode_chk;
  ALTER TABLE automation_policies ADD CONSTRAINT automation_policies_control_mode_chk
    CHECK (control_mode IN ('manual_only','approval_required','maintenance_window','auto_execute','read_only'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Tenant-wide automation control plane (global e-stop / pause)
CREATE TABLE IF NOT EXISTS automation_control_plane (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  emergency_stop BOOLEAN NOT NULL DEFAULT FALSE,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Durable workflow definitions (signed metadata)
CREATE TABLE IF NOT EXISTS automation_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  definition JSONB NOT NULL DEFAULT '{"steps":[]}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  signature_hash VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  runbook_id UUID REFERENCES runbook_definitions(id) ON DELETE SET NULL,
  policy_id UUID REFERENCES automation_policies(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT automation_workflows_status_chk CHECK (status IN ('draft','active','archived'))
);
CREATE INDEX IF NOT EXISTS idx_automation_workflows_tenant ON automation_workflows(tenant_id);

-- Workflow executions (resumable)
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  mode VARCHAR(32) NOT NULL DEFAULT 'simulation',
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  current_step INTEGER NOT NULL DEFAULT 0,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_by UUID,
  approved_by UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT automation_executions_mode_chk CHECK (mode IN ('simulation','dry_run','live')),
  CONSTRAINT automation_executions_status_chk CHECK (status IN (
    'queued','awaiting_approval','running','paused','completed','failed','cancelled','rolled_back','compensating'
  ))
);
CREATE INDEX IF NOT EXISTS idx_automation_executions_tenant ON automation_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(tenant_id, status);

CREATE TABLE IF NOT EXISTS automation_execution_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES automation_executions(id) ON DELETE CASCADE,
  step_key VARCHAR(128) NOT NULL,
  step_index INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 0,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT automation_execution_steps_status_chk CHECK (status IN (
    'pending','running','succeeded','failed','skipped','compensated','timed_out'
  ))
);
CREATE INDEX IF NOT EXISTS idx_automation_execution_steps_exec ON automation_execution_steps(execution_id);

CREATE TABLE IF NOT EXISTS automation_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL REFERENCES automation_executions(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  requested_by UUID,
  decided_by UUID,
  expires_at TIMESTAMPTZ,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  CONSTRAINT automation_approvals_status_chk CHECK (status IN (
    'pending','approved','rejected','expired','emergency_approved'
  ))
);
CREATE INDEX IF NOT EXISTS idx_automation_approvals_tenant ON automation_approvals(tenant_id, status);

CREATE TABLE IF NOT EXISTS automation_simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES automation_workflows(id) ON DELETE SET NULL,
  execution_id UUID REFERENCES automation_executions(id) ON DELETE SET NULL,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  predicted_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  dependency_impact JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_duration_ms INTEGER,
  rollback_preview JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_simulations_tenant ON automation_simulations(tenant_id);

CREATE TABLE IF NOT EXISTS automation_history_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64),
  resource_id UUID,
  actor_id UUID,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  immutable_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_history_tenant ON automation_history_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_history_type ON automation_history_events(tenant_id, event_type);

-- Seed control plane for existing tenants
INSERT INTO automation_control_plane (tenant_id, emergency_stop, paused)
SELECT id, FALSE, FALSE FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Extend runbook catalog with enterprise templates (idempotent per tenant by name+version)
INSERT INTO runbook_definitions (tenant_id, name, description, steps, linked_action_code, version, status)
SELECT t.id, r.name, r.description, r.steps::jsonb, r.linked_action_code, 1, 'active'
FROM tenants t
CROSS JOIN (VALUES
  ('Restart service', 'Controlled restart of a named service', '[{"key":"validate","action":"validate_target"},{"key":"restart","action":"restart_service","compensate":"verify_health"},{"key":"verify","action":"verify_health"}]', 'restart_service'),
  ('Restart pod', 'Restart workload pod/replica set', '[{"key":"validate","action":"validate_target"},{"key":"restart","action":"restart_pod","compensate":"scale_check"},{"key":"verify","action":"verify_health"}]', 'restart_pod'),
  ('Scale deployment', 'Scale replicas up/down within policy bounds', '[{"key":"validate","action":"validate_target"},{"key":"scale","action":"scale_replicas","compensate":"scale_revert"},{"key":"verify","action":"verify_health"}]', 'scale_replicas'),
  ('Clear cache', 'Flush application/cache tier safely', '[{"key":"validate","action":"validate_target"},{"key":"clear","action":"clear_cache","compensate":"warm_cache"}]', 'clear_cache'),
  ('Rotate certificate', 'Certificate rotation with validation', '[{"key":"validate","action":"validate_cert"},{"key":"rotate","action":"rotate_certificate","compensate":"rollback_cert"},{"key":"verify","action":"verify_tls"}]', 'rotate_certificate'),
  ('Rotate secrets', 'Secret rotation via secrets store metadata', '[{"key":"validate","action":"validate_secret"},{"key":"rotate","action":"rotate_secrets","compensate":"rollback_secret"}]', 'rotate_secrets'),
  ('Restart application', 'Application process/service restart', '[{"key":"validate","action":"validate_target"},{"key":"restart","action":"restart_application","compensate":"verify_health"}]', 'restart_application'),
  ('Database connection reset', 'Reset pooled DB connections', '[{"key":"validate","action":"validate_target"},{"key":"reset","action":"rotate_connection_pool","compensate":"verify_db"}]', 'rotate_connection_pool'),
  ('Queue cleanup', 'Drain/cleanup stale queue messages (dry-run first)', '[{"key":"validate","action":"validate_queue"},{"key":"cleanup","action":"queue_cleanup","compensate":"requeue_preview"}]', 'queue_cleanup'),
  ('Log collection', 'Collect diagnostic logs for incident', '[{"key":"validate","action":"validate_target"},{"key":"collect","action":"collect_logs"}]', 'collect_logs')
) AS r(name, description, steps, linked_action_code)
WHERE NOT EXISTS (
  SELECT 1 FROM runbook_definitions rd
  WHERE rd.tenant_id = t.id AND rd.name = r.name AND rd.version = 1
);
