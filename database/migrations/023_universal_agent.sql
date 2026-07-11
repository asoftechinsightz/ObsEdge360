-- Phase 3 Wave 2: Universal Agent control plane (migration 023)

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  agent_key_hash VARCHAR(128) NOT NULL,
  hostname VARCHAR(255),
  platform VARCHAR(50) NOT NULL DEFAULT 'linux',
  os_version VARCHAR(100),
  architecture VARCHAR(50),
  version VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'registered',
  discovery_agent_id UUID REFERENCES discovery_agents(id) ON DELETE SET NULL,
  labels JSONB NOT NULL DEFAULT '{}',
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  last_heartbeat_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_tenant_status ON agents (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_agents_tenant_platform ON agents (tenant_id, platform);
CREATE INDEX IF NOT EXISTS idx_agents_hostname ON agents (tenant_id, hostname);

CREATE TABLE IF NOT EXISTS agent_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ip_addresses JSONB NOT NULL DEFAULT '[]',
  mac_addresses JSONB NOT NULL DEFAULT '[]',
  cpu JSONB NOT NULL DEFAULT '{}',
  memory JSONB NOT NULL DEFAULT '{}',
  disk JSONB NOT NULL DEFAULT '{}',
  cloud_metadata JSONB NOT NULL DEFAULT '{}',
  region VARCHAR(100),
  availability_zone VARCHAR(100),
  raw JSONB NOT NULL DEFAULT '{}',
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id)
);

CREATE TABLE IF NOT EXISTS agent_heartbeat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  version VARCHAR(50),
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_heartbeat_agent ON agent_heartbeat (agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  revision INT NOT NULL DEFAULT 1,
  config JSONB NOT NULL DEFAULT '{}',
  checksum VARCHAR(128),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id)
);

CREATE TABLE IF NOT EXISTS agent_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plugin_id VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  version VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'enabled',
  last_run_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  UNIQUE (agent_id, plugin_id)
);

CREATE TABLE IF NOT EXISTS agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  platform VARCHAR(50),
  channel VARCHAR(50) NOT NULL DEFAULT 'stable',
  download_url TEXT,
  checksum_sha256 VARCHAR(128),
  signature TEXT,
  mandatory BOOLEAN NOT NULL DEFAULT false,
  release_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  message TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_tenant ON agent_events (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  healthy BOOLEAN NOT NULL DEFAULT true,
  queue_depth INT NOT NULL DEFAULT 0,
  cpu_usage NUMERIC(8,2),
  memory_usage NUMERIC(8,2),
  collector_status JSONB NOT NULL DEFAULT '{}',
  details JSONB NOT NULL DEFAULT '{}',
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_id)
);

CREATE TABLE IF NOT EXISTS agent_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  spiffe_id TEXT,
  fingerprint_sha256 VARCHAR(64),
  not_before TIMESTAMPTZ,
  not_after TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  pem_public TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_bootstrap_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  label VARCHAR(200),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  uses INT NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
