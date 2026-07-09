-- OpsEdge360 Sprint 6 — APM / OTLP persistence
-- Version: 009

CREATE TABLE IF NOT EXISTS otlp_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value DOUBLE PRECISION NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    labels JSONB DEFAULT '{}',
    service_name VARCHAR(255),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otlp_metrics_tenant_time ON otlp_metrics(tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_otlp_metrics_name ON otlp_metrics(tenant_id, name);

CREATE TABLE IF NOT EXISTS otlp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'INFO',
    service_name VARCHAR(255),
    trace_id VARCHAR(64),
    span_id VARCHAR(32),
    attributes JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otlp_logs_tenant_time ON otlp_logs(tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_otlp_logs_severity ON otlp_logs(tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_otlp_logs_service ON otlp_logs(tenant_id, service_name);
CREATE INDEX IF NOT EXISTS idx_otlp_logs_body_trgm ON otlp_logs USING gin (body gin_trgm_ops);

CREATE TABLE IF NOT EXISTS otlp_spans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    trace_id VARCHAR(64) NOT NULL,
    span_id VARCHAR(32) NOT NULL,
    parent_span_id VARCHAR(32),
    name VARCHAR(500) NOT NULL,
    service_name VARCHAR(255) NOT NULL DEFAULT 'unknown',
    duration_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    status_code VARCHAR(20) DEFAULT 'UNSET',
    attributes JSONB DEFAULT '{}',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otlp_spans_tenant_time ON otlp_spans(tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_otlp_spans_trace ON otlp_spans(tenant_id, trace_id);
CREATE INDEX IF NOT EXISTS idx_otlp_spans_service ON otlp_spans(tenant_id, service_name);
