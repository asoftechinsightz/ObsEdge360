-- OpsEdge360 Sprint 0 — Enterprise Foundation
-- Version: 015
-- Adds RBAC, agent config, scheduler, config management, topology versioning, telemetry pipeline

-- RBAC Foundation
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS abac_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    effect VARCHAR(10) NOT NULL CHECK (effect IN ('allow', 'deny')),
    resource_pattern VARCHAR(500) NOT NULL,
    action_pattern VARCHAR(500) NOT NULL,
    conditions JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 100,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id UUID,
    actor_type VARCHAR(50) NOT NULL DEFAULT 'user',
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    correlation_id VARCHAR(64),
    ip_address INET,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_time ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id) WHERE correlation_id IS NOT NULL;

-- Agent Framework Extensions
ALTER TABLE discovery_agents ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE discovery_agents ADD COLUMN IF NOT EXISTS config_revision INTEGER DEFAULT 0;
ALTER TABLE discovery_agents ADD COLUMN IF NOT EXISTS config_payload JSONB DEFAULT '{}';
ALTER TABLE discovery_agents ADD COLUMN IF NOT EXISTS config_checksum VARCHAR(64);
ALTER TABLE discovery_agents ADD COLUMN IF NOT EXISTS certificate_fingerprint VARCHAR(64);
ALTER TABLE discovery_agents ADD COLUMN IF NOT EXISTS update_channel VARCHAR(50) DEFAULT 'stable';

CREATE TABLE IF NOT EXISTS agent_config_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES discovery_agents(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL,
    config JSONB NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    pushed_by VARCHAR(50) DEFAULT 'platform',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, revision)
);

CREATE TABLE IF NOT EXISTS agent_offline_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES discovery_agents(id) ON DELETE CASCADE,
    endpoint VARCHAR(500) NOT NULL,
    payload JSONB NOT NULL,
    attempts INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- CMDB Configuration History & Drift
CREATE TABLE IF NOT EXISTS ci_config_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    attributes JSONB NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    change_type VARCHAR(20) NOT NULL DEFAULT 'update',
    changed_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ci_id, version)
);

CREATE INDEX idx_ci_config_history_ci ON ci_config_history(ci_id, version DESC);

CREATE TABLE IF NOT EXISTS ci_config_drift (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    expected_checksum VARCHAR(64) NOT NULL,
    actual_checksum VARCHAR(64) NOT NULL,
    drift_details JSONB DEFAULT '{}',
    severity VARCHAR(20) DEFAULT 'medium',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_ci_drift_open ON ci_config_drift(tenant_id, resolved_at) WHERE resolved_at IS NULL;

-- Topology Versioning
CREATE TABLE IF NOT EXISTS topology_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    topology_type VARCHAR(50) NOT NULL,
    version INTEGER NOT NULL,
    graph JSONB NOT NULL,
    node_count INTEGER DEFAULT 0,
    edge_count INTEGER DEFAULT 0,
    layout_algorithm VARCHAR(50) DEFAULT 'force-directed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, topology_type, version)
);

CREATE INDEX idx_topology_latest ON topology_snapshots(tenant_id, topology_type, version DESC);

-- Enterprise Scheduler
CREATE TABLE IF NOT EXISTS scheduler_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    cron_expression VARCHAR(100),
    payload JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    retry_policy JSONB DEFAULT '{"maxAttempts":3,"backoffMs":5000}',
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_scheduler_due ON scheduler_jobs(status, next_run_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS scheduler_job_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES scheduler_jobs(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    attempt INTEGER DEFAULT 1,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    result JSONB DEFAULT '{}'
);

CREATE INDEX idx_job_runs_job ON scheduler_job_runs(job_id, started_at DESC);

CREATE TABLE IF NOT EXISTS scheduler_dead_letter (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES scheduler_jobs(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuration Management
CREATE TABLE IF NOT EXISTS config_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_body TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    policy_rules JSONB DEFAULT '[]',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name, version)
);

CREATE TABLE IF NOT EXISTS config_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES config_templates(id),
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    rendered_config JSONB NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    deployed_at TIMESTAMPTZ,
    rolled_back_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_config_deployments_target ON config_deployments(tenant_id, target_type, target_id);

-- Telemetry Pipeline Sources
CREATE TABLE IF NOT EXISTS telemetry_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    last_ingest_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_telemetry_sources_type ON telemetry_sources(tenant_id, source_type) WHERE enabled = true;

-- Plugin SDK Registry
CREATE TABLE IF NOT EXISTS plugin_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plugin_id VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    runtime VARCHAR(20) NOT NULL,
    manifest JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'registered',
    sandbox_level VARCHAR(20) DEFAULT 'process',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, plugin_id, version)
);

-- Rate limiting state (optional persistence)
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    bucket_key VARCHAR(255) PRIMARY KEY,
    tokens INTEGER NOT NULL,
    last_refill TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default roles for existing tenants
INSERT INTO roles (tenant_id, name, description, permissions, is_system)
SELECT t.id, 'admin', 'Full platform administrator', '["*"]'::jsonb, true
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.tenant_id = t.id AND r.name = 'admin');

INSERT INTO roles (tenant_id, name, description, permissions, is_system)
SELECT t.id, 'operator', 'Operations engineer', '["discovery:*","cmdb:read","observability:*","remediation:execute"]'::jsonb, true
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.tenant_id = t.id AND r.name = 'operator');

INSERT INTO roles (tenant_id, name, description, permissions, is_system)
SELECT t.id, 'viewer', 'Read-only access', '["*:read"]'::jsonb, true
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.tenant_id = t.id AND r.name = 'viewer');
