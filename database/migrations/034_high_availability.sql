-- 034_high_availability.sql — Phase 5 Wave 2 HA management metadata only

CREATE TABLE IF NOT EXISTS ha_cluster_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_name VARCHAR(128) NOT NULL,
  role VARCHAR(64) NOT NULL DEFAULT 'worker',
  zone VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'unknown',
  last_heartbeat_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (node_name)
);

CREATE TABLE IF NOT EXISTS ha_component_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component VARCHAR(64) NOT NULL,
  mode VARCHAR(64) NOT NULL DEFAULT 'single',
  status VARCHAR(32) NOT NULL DEFAULT 'unknown',
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (component)
);

CREATE TABLE IF NOT EXISTS ha_replication_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component VARCHAR(64) NOT NULL,
  primary_endpoint TEXT,
  replica_endpoint TEXT,
  lag_bytes BIGINT,
  lag_seconds NUMERIC(12,3),
  in_recovery BOOLEAN,
  status VARCHAR(32) NOT NULL DEFAULT 'unknown',
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ha_replication_component ON ha_replication_status(component, checked_at DESC);

CREATE TABLE IF NOT EXISTS ha_failover_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  from_node VARCHAR(128),
  to_node VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'recorded',
  notes TEXT,
  recorded_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ha_failover_created ON ha_failover_events(created_at DESC);

CREATE TABLE IF NOT EXISTS ha_backup_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_run_id UUID REFERENCES backup_runs(id) ON DELETE SET NULL,
  artifact_path TEXT,
  integrity_ok BOOLEAN,
  restore_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL DEFAULT 'recorded',
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ha_upgrade_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_version VARCHAR(64),
  to_version VARCHAR(64),
  phase VARCHAR(64) NOT NULL DEFAULT 'precheck',
  passed BOOLEAN,
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ha_topology_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(128) NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ha_topology_config (config_key, config_value)
VALUES (
  'foundation',
  jsonb_build_object(
    'wave', 'v1.0.0-wave2',
    'composeOverlay', 'docker-compose.ha.yml',
    'helmChart', 'infra/helm/opsedge360',
    'multiNodeActiveDefault', false,
    'gaClaim', false
  )
)
ON CONFLICT (config_key) DO NOTHING;
