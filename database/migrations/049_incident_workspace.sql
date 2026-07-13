-- 049_incident_workspace.sql
-- P1 — Incident lifecycle workspace (owner, watchers, activity, telemetry)

ALTER TABLE ops_incidents
  ALTER COLUMN status TYPE VARCHAR(40);

ALTER TABLE ops_incidents
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'p2',
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS investigating_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS business_impact JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS workspace_state JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS closure_report_id UUID,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS ops_incident_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES ops_incidents(id) ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL,
  actor_id VARCHAR(255),
  actor_role VARCHAR(80),
  previous_state JSONB NOT NULL DEFAULT '{}',
  new_state JSONB NOT NULL DEFAULT '{}',
  detail JSONB NOT NULL DEFAULT '{}',
  correlation_id VARCHAR(120),
  api_path VARCHAR(255),
  automation_id VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_incident_activity_inc
  ON ops_incident_activity (tenant_id, incident_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ops_incident_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES ops_incidents(id) ON DELETE CASCADE,
  author_id VARCHAR(255) NOT NULL,
  author_name VARCHAR(255),
  body TEXT NOT NULL,
  mentions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_incident_comments_inc
  ON ops_incident_comments (tenant_id, incident_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ops_incident_watchers (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES ops_incidents(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  added_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (incident_id, user_id)
);
