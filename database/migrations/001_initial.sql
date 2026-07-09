-- OpsEdge360 Initial Schema Migration
-- Version: 001

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Tenants
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    region VARCHAR(50) DEFAULT 'ap-south-1',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    external_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Configuration Items (CMDB)
CREATE TYPE ci_type AS ENUM (
    'server', 'vm', 'container', 'pod', 'database', 'application',
    'service', 'network_device', 'firewall', 'load_balancer',
    'ot_device', 'cloud_resource', 'api', 'queue', 'cache', 'user', 'location', 'saas_app'
);

CREATE TYPE ci_status AS ENUM ('discovered', 'active', 'maintenance', 'decommissioned');

CREATE TABLE configuration_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    external_id VARCHAR(255),
    name VARCHAR(500) NOT NULL,
    ci_type ci_type NOT NULL,
    status ci_status DEFAULT 'discovered',
    health_score SMALLINT DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
    compliance_score SMALLINT DEFAULT 100 CHECK (compliance_score BETWEEN 0 AND 100),
    risk_score SMALLINT DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    ai_confidence_score SMALLINT DEFAULT 50 CHECK (ai_confidence_score BETWEEN 0 AND 100),
    owner_id UUID REFERENCES users(id),
    location_id UUID,
    attributes JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    discovered_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ci_tenant_type ON configuration_items(tenant_id, ci_type);
CREATE INDEX idx_ci_name_trgm ON configuration_items USING gin(name gin_trgm_ops);
CREATE INDEX idx_ci_external ON configuration_items(tenant_id, external_id);

-- Relationships
CREATE TYPE relationship_type AS ENUM (
    'depends_on', 'runs_on', 'connects_to', 'owned_by',
    'part_of', 'secures', 'monitors', 'calls'
);

CREATE TYPE relationship_strength AS ENUM ('weak', 'normal', 'critical');

CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    source_ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    target_ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    strength relationship_strength DEFAULT 'normal',
    discovered_by VARCHAR(50) DEFAULT 'agent',
    ai_confidence_score SMALLINT DEFAULT 80,
    metadata JSONB DEFAULT '{}',
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rel_source ON relationships(tenant_id, source_ci_id);
CREATE INDEX idx_rel_target ON relationships(tenant_id, target_ci_id);

-- Business Services
CREATE TABLE business_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tier SMALLINT DEFAULT 2 CHECK (tier BETWEEN 1 AND 3),
    sla_target DECIMAL(5,2) DEFAULT 99.90,
    revenue_per_hour DECIMAL(15,2) DEFAULT 0,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES business_services(id) ON DELETE CASCADE,
    ci_id UUID NOT NULL REFERENCES configuration_items(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'entry_point',
    UNIQUE(service_id, ci_id)
);

-- Change Records
CREATE TABLE change_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ci_id UUID REFERENCES configuration_items(id),
    change_type VARCHAR(50) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_change_ci ON change_records(ci_id, changed_at DESC);

-- Discovery Connectors
CREATE TABLE discovery_connectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    protocol VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance
CREATE TABLE compliance_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(20),
    description TEXT
);

CREATE TABLE compliance_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(id),
    control_id VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    validation_query JSONB,
    severity VARCHAR(20) DEFAULT 'medium'
);

CREATE TABLE compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    control_id UUID NOT NULL REFERENCES compliance_controls(id),
    ci_id UUID REFERENCES configuration_items(id),
    status VARCHAR(20) NOT NULL,
    score SMALLINT,
    details JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ci_id UUID REFERENCES configuration_items(id),
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'open',
    fired_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Sustainability
CREATE TABLE sustainability_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ci_id UUID REFERENCES configuration_items(id),
    energy_kwh DECIMAL(12,4),
    carbon_kg DECIMAL(12,4),
    pue DECIMAL(4,2),
    renewable_pct DECIMAL(5,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log (append-only)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    actor_id VARCHAR(255),
    actor_type VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_time ON audit_log(tenant_id, created_at DESC);

-- Agent Runs
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_type VARCHAR(50) NOT NULL,
    trigger_event VARCHAR(100),
    status VARCHAR(20) DEFAULT 'running',
    input JSONB,
    output JSONB,
    tools_used TEXT[],
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Seed default tenant and frameworks
INSERT INTO tenants (name, slug) VALUES ('Default Tenant', 'default');

INSERT INTO compliance_frameworks (code, name, version) VALUES
    ('ISO27001', 'ISO/IEC 27001', '2022'),
    ('NIST-CSF', 'NIST Cybersecurity Framework', '2.0'),
    ('PCI-DSS', 'PCI DSS', '4.0'),
    ('GDPR', 'General Data Protection Regulation', '2016'),
    ('RBI-CSF', 'RBI Cyber Security Framework', '2016'),
    ('SOC2', 'SOC 2 Type II', '2017');
