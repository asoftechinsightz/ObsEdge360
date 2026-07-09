-- OpsEdge360 Sprint 7 — Transaction SLOs and samples
-- Version: 010

CREATE TABLE IF NOT EXISTS transaction_slos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES business_transactions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    metric VARCHAR(50) NOT NULL DEFAULT 'p99_latency_ms',
    target_value DECIMAL(12,2) NOT NULL,
    window_hours INTEGER NOT NULL DEFAULT 24,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, transaction_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tx_slos_tenant ON transaction_slos(tenant_id);

CREATE TABLE IF NOT EXISTS transaction_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES business_transactions(id) ON DELETE CASCADE,
    trace_id VARCHAR(64),
    latency_ms INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ok',
    step_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_samples_tenant_time ON transaction_samples(tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_samples_tx ON transaction_samples(transaction_id, recorded_at DESC);

ALTER TABLE business_transactions ADD COLUMN IF NOT EXISTS slo_target_ms INTEGER;
ALTER TABLE business_transactions ADD COLUMN IF NOT EXISTS error_budget_pct DECIMAL(5,2) DEFAULT 1.0;
