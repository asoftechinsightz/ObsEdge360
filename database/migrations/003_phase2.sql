-- OpsEdge360 Phase 2 Migration
-- Business transactions, network flows, compliance controls, agent approvals

-- Business Transactions
CREATE TABLE IF NOT EXISTS business_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    service_id UUID REFERENCES business_services(id),
    name VARCHAR(255) NOT NULL,
    classification VARCHAR(100) NOT NULL,
    template_code VARCHAR(50),
    entry_ci_id UUID REFERENCES configuration_items(id),
    p50_latency_ms INTEGER,
    p99_latency_ms INTEGER,
    volume_per_hour INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_btx_tenant ON business_transactions(tenant_id, classification);

CREATE TABLE IF NOT EXISTS transaction_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES business_transactions(id) ON DELETE CASCADE,
    step_order SMALLINT NOT NULL,
    step_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    ci_id UUID REFERENCES configuration_items(id),
    avg_latency_ms INTEGER DEFAULT 0,
    p99_latency_ms INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ok',
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_tx_steps ON transaction_steps(transaction_id, step_order);

-- Network observability
CREATE TABLE IF NOT EXISTS network_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    src_ci_id UUID REFERENCES configuration_items(id),
    dst_ci_id UUID REFERENCES configuration_items(id),
    src_ip INET,
    dst_ip INET,
    src_port INTEGER,
    dst_port INTEGER,
    protocol VARCHAR(20),
    bytes BIGINT DEFAULT 0,
    packets BIGINT DEFAULT 0,
    latency_ms DECIMAL(10,2),
    jitter_ms DECIMAL(10,2),
    packet_loss_pct DECIMAL(5,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_netflows_tenant_time ON network_flows(tenant_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS network_interface_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ci_id UUID NOT NULL REFERENCES configuration_items(id),
    interface_name VARCHAR(100),
    utilization_pct DECIMAL(5,2),
    in_mbps DECIMAL(12,2),
    out_mbps DECIMAL(12,2),
    errors INTEGER DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent remediation approvals
CREATE TABLE IF NOT EXISTS remediation_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_run_id UUID REFERENCES agent_runs(id),
    agent_type VARCHAR(50) NOT NULL,
    risk_tier VARCHAR(20) NOT NULL,
    action TEXT NOT NULL,
    evidence TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(255)
);

-- Tenant enabled frameworks
CREATE TABLE IF NOT EXISTS tenant_frameworks (
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(id),
    enabled BOOLEAN DEFAULT true,
    PRIMARY KEY (tenant_id, framework_id)
);

-- Compliance evidence
CREATE TABLE IF NOT EXISTS compliance_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    control_id UUID NOT NULL REFERENCES compliance_controls(id),
    ci_id UUID REFERENCES configuration_items(id),
    evidence_type VARCHAR(50),
    artifact JSONB,
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed ISO 27001 controls (subset) — idempotent
INSERT INTO compliance_controls (framework_id, control_id, title, description, validation_query, severity)
SELECT f.id, v.control_id, v.title, v.description, v.validation_query::jsonb, v.severity
FROM compliance_frameworks f
CROSS JOIN (VALUES
  ('A.8.1', 'Asset inventory', 'All assets shall be inventoried',
   '{"type":"cmdb_count","filter":{},"pass_condition":"count > 0","message":"CMDB must contain assets"}', 'high'),
  ('A.8.2', 'Asset ownership', 'Assets shall have assigned owners',
   '{"type":"cmdb_query","filter":{"owner_id":null},"pass_condition":"count == 0","message":"All CIs must have owners"}', 'medium'),
  ('A.10.1', 'Cryptographic controls', 'Databases must have encryption at rest',
   '{"type":"cmdb_query","filter":{"ci_type":"database","attributes_key":"encryption_at_rest","attributes_value":false},"pass_condition":"count == 0","message":"All databases must encrypt data at rest"}', 'critical'),
  ('A.12.4', 'Logging and monitoring', 'Critical APIs must have health score above 70',
   '{"type":"cmdb_query","filter":{"ci_type":"api","health_score_lt":70},"pass_condition":"count == 0","message":"API health scores must be above 70"}', 'high')
) AS v(control_id, title, description, validation_query, severity)
WHERE f.code = 'ISO27001'
  AND NOT EXISTS (
    SELECT 1 FROM compliance_controls c WHERE c.framework_id = f.id AND c.control_id = v.control_id
  );

-- Enable frameworks for default tenant
INSERT INTO tenant_frameworks (tenant_id, framework_id, enabled)
SELECT t.id, f.id, true FROM tenants t CROSS JOIN compliance_frameworks f WHERE t.slug = 'default'
ON CONFLICT DO NOTHING;
