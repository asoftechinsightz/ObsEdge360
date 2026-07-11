-- 025_topology_live.sql
-- Phase 3 Wave 4 — Live topology, inferred deps, layouts, blast cache, events

CREATE TABLE IF NOT EXISTS inferred_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_ci_id UUID REFERENCES configuration_items(id) ON DELETE SET NULL,
  target_ci_id UUID REFERENCES configuration_items(id) ON DELETE SET NULL,
  source_service VARCHAR(255) NOT NULL,
  target_service VARCHAR(255) NOT NULL,
  relationship_type VARCHAR(64) NOT NULL DEFAULT 'calls',
  layer VARCHAR(64) NOT NULL DEFAULT 'service',
  origin VARCHAR(64) NOT NULL DEFAULT 'trace',
  call_count BIGINT NOT NULL DEFAULT 0,
  avg_latency_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
  error_count BIGINT NOT NULL DEFAULT 0,
  confidence SMALLINT NOT NULL DEFAULT 80,
  window_hours INT NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source_service, target_service, origin)
);

CREATE INDEX IF NOT EXISTS idx_inferred_deps_tenant_seen
  ON inferred_dependencies (tenant_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_inferred_deps_source_ci
  ON inferred_dependencies (tenant_id, source_ci_id)
  WHERE source_ci_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inferred_deps_target_ci
  ON inferred_dependencies (tenant_id, target_ci_id)
  WHERE target_ci_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS topology_layout_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  topology_type VARCHAR(64) NOT NULL,
  snapshot_id UUID,
  node_key VARCHAR(255) NOT NULL,
  layout_algorithm VARCHAR(64) NOT NULL DEFAULT 'force-directed',
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  layer VARCHAR(64),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, topology_type, node_key, layout_algorithm)
);

CREATE INDEX IF NOT EXISTS idx_topo_layout_tenant_type
  ON topology_layout_positions (tenant_id, topology_type);

CREATE TABLE IF NOT EXISTS blast_radius_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  root_ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
  direction VARCHAR(16) NOT NULL DEFAULT 'downstream',
  depth INT NOT NULL DEFAULT 3,
  result JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  UNIQUE (tenant_id, root_ci_id, direction, depth)
);

CREATE INDEX IF NOT EXISTS idx_blast_cache_expires
  ON blast_radius_cache (expires_at);

CREATE TABLE IF NOT EXISTS topology_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  topology_type VARCHAR(64),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topology_events_tenant_id
  ON topology_events (tenant_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_topology_events_created
  ON topology_events (tenant_id, created_at DESC);

ALTER TABLE topology_nodes
  ADD COLUMN IF NOT EXISTS layer VARCHAR(64),
  ADD COLUMN IF NOT EXISTS pos_x DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS pos_y DOUBLE PRECISION;

ALTER TABLE relationships
  ADD COLUMN IF NOT EXISTS origin VARCHAR(64) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_rel_origin
  ON relationships (tenant_id, origin)
  WHERE origin IS NOT NULL;
