-- OpsEdge360 Phase 4 Migration — Scale
-- Predictive analytics, quantum readiness, industry packs, HA/DR, FedRAMP

-- Industry compliance packs
CREATE TABLE IF NOT EXISTS industry_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(50) NOT NULL,
    description TEXT,
    framework_codes TEXT[] NOT NULL DEFAULT '{}',
    control_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_industry_packs (
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pack_id UUID NOT NULL REFERENCES industry_packs(id),
    enabled BOOLEAN DEFAULT true,
    enabled_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, pack_id)
);

-- Predictive analytics
CREATE TABLE IF NOT EXISTS predictive_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    forecast_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    ci_id UUID REFERENCES configuration_items(id),
    horizon_days SMALLINT DEFAULT 7,
    forecast_points JSONB NOT NULL DEFAULT '[]',
    confidence_low JSONB DEFAULT '[]',
    confidence_high JSONB DEFAULT '[]',
    model_version VARCHAR(50) DEFAULT 'prophet-lite-v1',
    business_impact JSONB DEFAULT '{}',
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecasts_tenant ON predictive_forecasts(tenant_id, forecast_type, generated_at DESC);

CREATE TABLE IF NOT EXISTS incident_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    ci_id UUID REFERENCES configuration_items(id),
    incident_type VARCHAR(50) NOT NULL,
    probability_pct SMALLINT NOT NULL,
    predicted_window_start TIMESTAMPTZ,
    predicted_window_end TIMESTAMPTZ,
    revenue_at_risk DECIMAL(15,2),
    affected_transactions TEXT[],
    root_cause_hypothesis TEXT,
    confidence_pct SMALLINT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_pred_tenant ON incident_predictions(tenant_id, status, created_at DESC);

-- Quantum readiness
CREATE TABLE IF NOT EXISTS quantum_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    external_job_id VARCHAR(255),
    provider VARCHAR(50) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    algorithm VARCHAR(100),
    qubits_used INTEGER,
    circuit_depth INTEGER,
    status VARCHAR(30) DEFAULT 'queued',
    classical_runtime_ms INTEGER,
    quantum_runtime_ms INTEGER,
    result_summary JSONB DEFAULT '{}',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quantum_jobs_tenant ON quantum_jobs(tenant_id, status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS quantum_readiness (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    assessment_type VARCHAR(50) NOT NULL,
    score SMALLINT NOT NULL,
    pqc_algorithms_adopted TEXT[] DEFAULT '{}',
    tls_pqc_ready BOOLEAN DEFAULT false,
    key_rotation_days INTEGER,
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    assessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global HA/DR
CREATE TABLE IF NOT EXISTS ha_dr_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    region_code VARCHAR(50) NOT NULL,
    region_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'primary',
    cloud_provider VARCHAR(50),
    rto_minutes INTEGER DEFAULT 60,
    rpo_minutes INTEGER DEFAULT 15,
    data_residency VARCHAR(50),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, region_code)
);

CREATE TABLE IF NOT EXISTS ha_dr_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    region_id UUID NOT NULL REFERENCES ha_dr_regions(id),
    health_status VARCHAR(20) NOT NULL DEFAULT 'healthy',
    replication_lag_ms INTEGER DEFAULT 0,
    last_failover_test TIMESTAMPTZ,
    failover_test_result VARCHAR(20),
    active_services INTEGER DEFAULT 0,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hadr_status_tenant ON ha_dr_status(tenant_id, checked_at DESC);

-- FedRAMP-ready controls
CREATE TABLE IF NOT EXISTS fedramp_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_family VARCHAR(10) NOT NULL,
    control_id VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    baseline VARCHAR(20) NOT NULL DEFAULT 'moderate',
    description TEXT,
    implementation_status VARCHAR(20) DEFAULT 'planned',
    evidence_required TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS fedramp_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    control_id UUID NOT NULL REFERENCES fedramp_controls(id),
    status VARCHAR(20) NOT NULL DEFAULT 'not_assessed',
    score SMALLINT,
    evidence_links JSONB DEFAULT '[]',
    assessor_notes TEXT,
    assessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fedramp_assess_tenant ON fedramp_assessments(tenant_id, assessed_at DESC);

-- Seed industry packs
INSERT INTO industry_packs (code, name, industry, description, framework_codes, control_count) VALUES
    ('bfsi', 'BFSI Regulated Pack', 'banking', 'RBI-CSF, NPCI, PCI-DSS, SWIFT-CSP for banking and payments',
     ARRAY['RBI-CSF', 'PCI-DSS', 'SOC2'], 48),
    ('healthcare', 'Healthcare Regulated Pack', 'healthcare', 'HIPAA, ISO 27001, HITRUST-aligned controls for PHI',
     ARRAY['ISO27001', 'SOC2', 'GDPR'], 36),
    ('government', 'Government & Public Sector Pack', 'government', 'FedRAMP Moderate, NIST 800-53, data residency controls',
     ARRAY['NIST-CSF', 'ISO27001', 'SOC2'], 52)
ON CONFLICT (code) DO NOTHING;

-- Seed FedRAMP control families (representative subset)
INSERT INTO fedramp_controls (control_family, control_id, title, baseline, description, implementation_status) VALUES
    ('AC', 'AC-2', 'Account Management', 'moderate', 'Manage system accounts including establishment, activation, and review', 'implemented'),
    ('AC', 'AC-3', 'Access Enforcement', 'moderate', 'Enforce approved authorizations for logical access', 'implemented'),
    ('AU', 'AU-2', 'Audit Events', 'moderate', 'Identify types of events the system is capable of auditing', 'implemented'),
    ('AU', 'AU-12', 'Audit Generation', 'moderate', 'Provide audit record generation capability', 'implemented'),
    ('CM', 'CM-2', 'Baseline Configuration', 'moderate', 'Develop and maintain baseline configurations', 'partial'),
    ('CP', 'CP-9', 'System Backup', 'moderate', 'Conduct backups of user-level and system-level information', 'implemented'),
    ('CP', 'CP-10', 'System Recovery and Reconstitution', 'moderate', 'Provide capability to recover and reconstitute after disruption', 'partial'),
    ('IA', 'IA-2', 'Identification and Authentication', 'moderate', 'Uniquely identify and authenticate organizational users', 'implemented'),
    ('IR', 'IR-4', 'Incident Handling', 'moderate', 'Implement incident handling capability', 'implemented'),
    ('SC', 'SC-8', 'Transmission Confidentiality and Integrity', 'moderate', 'Protect confidentiality and integrity of transmitted information', 'implemented'),
    ('SC', 'SC-13', 'Cryptographic Protection', 'moderate', 'Implement cryptographic mechanisms to protect information', 'partial')
ON CONFLICT (control_id) DO NOTHING;

-- Additional frameworks for industry packs
INSERT INTO compliance_frameworks (code, name, version, description) VALUES
    ('HIPAA', 'Health Insurance Portability and Accountability Act', '2013', 'US healthcare PHI protection'),
    ('NPCI', 'NPCI Security Guidelines', '2023', 'Indian payment infrastructure security'),
    ('SWIFT-CSP', 'SWIFT Customer Security Programme', '2024', 'Banking messaging security')
ON CONFLICT (code) DO NOTHING;
