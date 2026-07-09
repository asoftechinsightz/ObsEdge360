-- OpsEdge360 Phase 3 Migration
-- Fraud, anomalies, SIEM, remediation runbooks, OT safety zones

-- OT Safety Zones
CREATE TABLE IF NOT EXISTS ot_safety_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    zone_level VARCHAR(20) NOT NULL DEFAULT 'production',
    read_only BOOLEAN DEFAULT true,
    max_poll_rate_hz DECIMAL(6,2) DEFAULT 1.0,
    requires_ot_engineer_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fraud & Anomaly Detection
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    reason_codes TEXT[],
    affected_ci_ids UUID[],
    affected_transaction_id UUID REFERENCES business_transactions(id),
    confidence_score SMALLINT,
    status VARCHAR(20) DEFAULT 'open',
    explainability JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fraud_tenant_status ON fraud_alerts(tenant_id, status, detected_at DESC);

CREATE TABLE IF NOT EXISTS anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ci_id UUID REFERENCES configuration_items(id),
    anomaly_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100),
    baseline_value DECIMAL(15,4),
    observed_value DECIMAL(15,4),
    deviation_sigma DECIMAL(6,2),
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- SIEM / SOAR Integration
CREATE TABLE IF NOT EXISTS siem_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    webhook_url TEXT,
    api_key_ref VARCHAR(255),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS siem_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    integration_id UUID REFERENCES siem_integrations(id),
    external_id VARCHAR(255),
    severity VARCHAR(20),
    title VARCHAR(500),
    source VARCHAR(100),
    raw_event JSONB,
    correlated_ci_ids UUID[],
    status VARCHAR(20) DEFAULT 'new',
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siem_events_tenant ON siem_events(tenant_id, received_at DESC);

-- Remediation Runbooks
CREATE TABLE IF NOT EXISTS remediation_runbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    risk_tier VARCHAR(20) NOT NULL DEFAULT 'medium',
    auto_execute BOOLEAN DEFAULT false,
    ot_zone_safe BOOLEAN DEFAULT false,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remediation_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    runbook_id UUID REFERENCES remediation_runbooks(id),
    approval_id UUID REFERENCES remediation_approvals(id),
    agent_run_id UUID REFERENCES agent_runs(id),
    status VARCHAR(20) NOT NULL,
    actions_executed JSONB,
    outcome TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Sustainability aggregates (daily rollups)
CREATE TABLE IF NOT EXISTS sustainability_rollups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ci_id UUID REFERENCES configuration_items(id),
    period_date DATE NOT NULL,
    energy_kwh DECIMAL(14,4) DEFAULT 0,
    carbon_kg DECIMAL(14,4) DEFAULT 0,
    pue DECIMAL(4,2),
    renewable_pct DECIMAL(5,2),
    idle_resources INTEGER DEFAULT 0,
    efficiency_score SMALLINT,
    UNIQUE(tenant_id, ci_id, period_date)
);

CREATE TABLE IF NOT EXISTS sustainability_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ci_id UUID REFERENCES configuration_items(id),
    recommendation_type VARCHAR(50),
    title VARCHAR(500),
    description TEXT,
    projected_savings_pct DECIMAL(5,2),
    projected_carbon_reduction_kg DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
