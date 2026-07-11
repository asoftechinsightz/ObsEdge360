-- Phase 3 Wave 3: Discovery & CMDB Depth (migration 024)

-- Extend CI / relationship enums safely
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='ci_type' AND e.enumlabel='cluster') THEN
    ALTER TYPE ci_type ADD VALUE 'cluster';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='ci_type' AND e.enumlabel='storage') THEN
    ALTER TYPE ci_type ADD VALUE 'storage';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='ci_type' AND e.enumlabel='middleware') THEN
    ALTER TYPE ci_type ADD VALUE 'middleware';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='ci_type' AND e.enumlabel='business_service') THEN
    ALTER TYPE ci_type ADD VALUE 'business_service';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='ci_type' AND e.enumlabel='k8s_object') THEN
    ALTER TYPE ci_type ADD VALUE 'k8s_object';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='relationship_type' AND e.enumlabel='hosted_by') THEN
    ALTER TYPE relationship_type ADD VALUE 'hosted_by';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='relationship_type' AND e.enumlabel='member_of') THEN
    ALTER TYPE relationship_type ADD VALUE 'member_of';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='relationship_type' AND e.enumlabel='uses') THEN
    ALTER TYPE relationship_type ADD VALUE 'uses';
  END IF;
END $$;

-- Compatibility view for code expecting ci_relationships
CREATE OR REPLACE VIEW ci_relationships AS
  SELECT * FROM relationships;

ALTER TABLE discovery_connectors
  ADD COLUMN IF NOT EXISTS secret_ref UUID,
  ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS rate_limit_per_min INT NOT NULL DEFAULT 60;

CREATE TABLE IF NOT EXISTS discovery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  job_type VARCHAR(50) NOT NULL DEFAULT 'scheduled'
    CHECK (job_type IN ('scheduled', 'on_demand', 'incremental', 'full')),
  connector_ids UUID[] NOT NULL DEFAULT '{}',
  schedule_cron VARCHAR(100),
  priority INT NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  parallel_workers INT NOT NULL DEFAULT 2,
  rate_limit_per_min INT NOT NULL DEFAULT 60,
  retry_max INT NOT NULL DEFAULT 3,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_jobs_tenant ON discovery_jobs (tenant_id, enabled);

CREATE TABLE IF NOT EXISTS discovery_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES discovery_connectors(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  target_type VARCHAR(50) NOT NULL DEFAULT 'host',
  address TEXT,
  credentials_secret_ref UUID,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_targets_tenant ON discovery_targets (tenant_id, enabled);

CREATE TABLE IF NOT EXISTS discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES discovery_jobs(id) ON DELETE SET NULL,
  connector_id UUID REFERENCES discovery_connectors(id) ON DELETE SET NULL,
  run_mode VARCHAR(50) NOT NULL DEFAULT 'full',
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'partial')),
  attempt INT NOT NULL DEFAULT 1,
  assets_discovered INT NOT NULL DEFAULT 0,
  relationships_inferred INT NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_runs_tenant ON discovery_runs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_runs_status ON discovery_runs (tenant_id, status);

CREATE TABLE IF NOT EXISTS discovery_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES discovery_runs(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  name VARCHAR(500) NOT NULL,
  ci_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  ci_id UUID REFERENCES configuration_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_results_run ON discovery_results (run_id);
CREATE INDEX IF NOT EXISTS idx_discovery_results_tenant ON discovery_results (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_results_external ON discovery_results (tenant_id, external_id);

CREATE TABLE IF NOT EXISTS topology_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  topology_type VARCHAR(50) NOT NULL,
  snapshot_id UUID REFERENCES topology_snapshots(id) ON DELETE CASCADE,
  ci_id UUID REFERENCES configuration_items(id) ON DELETE SET NULL,
  node_key VARCHAR(255) NOT NULL,
  label VARCHAR(500),
  node_type VARCHAR(50),
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, topology_type, node_key, snapshot_id)
);

CREATE INDEX IF NOT EXISTS idx_topology_nodes_tenant ON topology_nodes (tenant_id, topology_type);

CREATE TABLE IF NOT EXISTS topology_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  topology_type VARCHAR(50) NOT NULL,
  snapshot_id UUID REFERENCES topology_snapshots(id) ON DELETE CASCADE,
  source_key VARCHAR(255) NOT NULL,
  target_key VARCHAR(255) NOT NULL,
  edge_type VARCHAR(50) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topology_edges_tenant ON topology_edges (tenant_id, topology_type);
CREATE INDEX IF NOT EXISTS idx_topology_edges_source ON topology_edges (tenant_id, source_key);

CREATE TABLE IF NOT EXISTS configuration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  version INT NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  before_hash VARCHAR(64),
  after_hash VARCHAR(64),
  before_attrs JSONB,
  after_attrs JSONB,
  source VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_configuration_history_ci ON configuration_history (ci_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_configuration_history_tenant ON configuration_history (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  drift_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  summary TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_drift_events_open ON drift_events (tenant_id, resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drift_events_ci ON drift_events (ci_id, detected_at DESC);

-- Large-scale indexes
CREATE INDEX IF NOT EXISTS idx_ci_external_tenant ON configuration_items (tenant_id, external_id);
CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships (tenant_id, source_ci_id);
CREATE INDEX IF NOT EXISTS idx_rel_target ON relationships (tenant_id, target_ci_id);
CREATE INDEX IF NOT EXISTS idx_rel_type ON relationships (tenant_id, relationship_type);
