-- OpsEdge360 — Prometheus live scrape / remote_write samples
-- Version: 012

CREATE TABLE IF NOT EXISTS prometheus_samples (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    labels JSONB DEFAULT '{}',
    job VARCHAR(100),
    instance VARCHAR(255),
    source VARCHAR(50) NOT NULL DEFAULT 'scrape',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prom_samples_tenant_time ON prometheus_samples(tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_prom_samples_name ON prometheus_samples(tenant_id, name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_prom_samples_instance ON prometheus_samples(tenant_id, instance, recorded_at DESC);

-- Retain recent samples only (optional cleanup helper comment):
-- DELETE FROM prometheus_samples WHERE recorded_at < NOW() - INTERVAL '7 days';
