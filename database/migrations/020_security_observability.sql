-- 020: Security observability events, rules, alerts (Wave 6)
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'security',
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  source_service VARCHAR(100) NOT NULL DEFAULT 'api-gateway',
  actor_id UUID,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  correlation_id VARCHAR(64),
  trace_id VARCHAR(128),
  risk_score INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_tenant_time
  ON security_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type
  ON security_events (tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_correlation
  ON security_events (correlation_id) WHERE correlation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS security_detection_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  rule_type VARCHAR(100) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_security_rules_global_name
  ON security_detection_rules (name) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_security_rules_tenant_name
  ON security_detection_rules (tenant_id, name) WHERE tenant_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES security_detection_rules(id) ON DELETE SET NULL,
  title VARCHAR(300) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  event_ids UUID[] NOT NULL DEFAULT '{}',
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_tenant_status
  ON security_alerts (tenant_id, status, created_at DESC);

-- Global default detection rules
INSERT INTO security_detection_rules (tenant_id, name, enabled, rule_type, config, severity)
SELECT NULL, v.name, true, v.rule_type, v.config::jsonb, v.severity
FROM (VALUES
  ('cross_tenant_spike', 'cross_tenant_spike', '{"threshold":3,"windowMinutes":15,"eventType":"authz.cross_tenant"}', 'high'),
  ('authz_deny_spike', 'authz_deny_spike', '{"threshold":10,"windowMinutes":15,"eventType":"authz.deny"}', 'medium'),
  ('secret_access_burst', 'secret_access_burst', '{"threshold":20,"windowMinutes":10,"eventType":"secret.accessed"}', 'medium')
) AS v(name, rule_type, config, severity)
WHERE NOT EXISTS (
  SELECT 1 FROM security_detection_rules r WHERE r.tenant_id IS NULL AND r.name = v.name
);
