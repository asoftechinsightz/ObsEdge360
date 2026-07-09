-- OpsEdge360 Sprint 5 — Infrastructure monitoring
-- Version: 008

CREATE TABLE IF NOT EXISTS prometheus_scrape_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    job_name VARCHAR(100) NOT NULL DEFAULT 'node',
    targets TEXT[] NOT NULL DEFAULT '{}',
    metrics_path VARCHAR(255) DEFAULT '/metrics',
    scrape_interval_seconds INTEGER NOT NULL DEFAULT 30 CHECK (scrape_interval_seconds >= 5),
    labels JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    last_scrape_at TIMESTAMPTZ,
    last_scrape_status VARCHAR(20) DEFAULT 'unknown',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_scrape_targets_tenant ON prometheus_scrape_targets(tenant_id);

CREATE TABLE IF NOT EXISTS host_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    hostname VARCHAR(255) NOT NULL,
    cpu_pct DECIMAL(5,2) DEFAULT 0,
    memory_pct DECIMAL(5,2) DEFAULT 0,
    disk_pct DECIMAL(5,2) DEFAULT 0,
    load_1m DECIMAL(8,2) DEFAULT 0,
    network_in_mbps DECIMAL(12,4) DEFAULT 0,
    network_out_mbps DECIMAL(12,4) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'up',
    labels JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_host_metrics_tenant_time ON host_metrics(tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_host_metrics_host ON host_metrics(tenant_id, hostname, recorded_at DESC);

CREATE TABLE IF NOT EXISTS notification_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metric VARCHAR(100) NOT NULL,
    operator VARCHAR(10) NOT NULL DEFAULT 'gt',
    threshold DECIMAL(12,4) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    duration_seconds INTEGER DEFAULT 60,
    channel_ids UUID[] DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    last_evaluated_at TIMESTAMPTZ,
    last_fired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_tenant ON alert_rules(tenant_id);

CREATE TABLE IF NOT EXISTS alert_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    status VARCHAR(20) NOT NULL DEFAULT 'firing',
    metric_value DECIMAL(12,4),
    labels JSONB DEFAULT '{}',
    notified_channels UUID[] DEFAULT '{}',
    fired_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alert_events_tenant ON alert_events(tenant_id, fired_at DESC);
