-- OpsEdge360 Sprint 2 — Discovery agents, schedules, notifications
-- Version: 007

CREATE TABLE discovery_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    agent_key_hash VARCHAR(255) NOT NULL,
    hostname VARCHAR(255),
    version VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'offline',
    capabilities TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    last_heartbeat_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_discovery_agents_tenant ON discovery_agents(tenant_id);
CREATE INDEX idx_discovery_agents_heartbeat ON discovery_agents(tenant_id, last_heartbeat_at DESC);

CREATE TABLE discovery_scan_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    connector_id UUID NOT NULL REFERENCES discovery_connectors(id) ON DELETE CASCADE,
    interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (interval_minutes >= 5),
    enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    notify_on_complete BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scan_schedules_due ON discovery_scan_schedules(enabled, next_run_at)
    WHERE enabled = true;

CREATE TABLE discovery_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discovery_notifications_tenant ON discovery_notifications(tenant_id, created_at DESC);

ALTER TABLE discovery_connectors ADD COLUMN IF NOT EXISTS schedule_interval_minutes INTEGER;
