-- 037_enterprise_integrations.sql — Phase 5 Wave 5 Enterprise Integrations & Identity
-- Additive only. Secret references only — never plaintext credentials.

-- Extend Wave 1 integration_connectors
ALTER TABLE integration_connectors
  ADD COLUMN IF NOT EXISTS secret_ref UUID;
ALTER TABLE integration_connectors
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE integration_connectors
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE integration_connectors
  ADD COLUMN IF NOT EXISTS retry_policy JSONB NOT NULL DEFAULT '{"maxAttempts":3,"backoffMs":1000,"maxBackoffMs":30000}'::jsonb;
ALTER TABLE integration_connectors
  ADD COLUMN IF NOT EXISTS circuit_breaker JSONB NOT NULL DEFAULT '{"failureThreshold":5,"resetTimeoutMs":60000,"state":"closed"}'::jsonb;
ALTER TABLE integration_connectors
  ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE integration_connectors
  ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ;
ALTER TABLE integration_connectors
  ADD COLUMN IF NOT EXISTS health_status VARCHAR(32) NOT NULL DEFAULT 'unknown';

CREATE TABLE IF NOT EXISTS connector_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES integration_connectors(id) ON DELETE CASCADE,
  instance_key VARCHAR(128) NOT NULL,
  environment VARCHAR(64) NOT NULL DEFAULT 'production',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_ref UUID,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, connector_id, instance_key)
);
CREATE INDEX IF NOT EXISTS idx_connector_instances_tenant ON connector_instances(tenant_id);

CREATE TABLE IF NOT EXISTS connector_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES integration_connectors(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES connector_instances(id) ON DELETE SET NULL,
  available BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms INTEGER,
  auth_ok BOOLEAN,
  success_rate NUMERIC(5,2),
  retry_count INTEGER NOT NULL DEFAULT 0,
  queue_depth INTEGER NOT NULL DEFAULT 0,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_connector_health_tenant ON connector_health(tenant_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS connector_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID,
  actor_id UUID,
  action VARCHAR(64) NOT NULL,
  idempotency_key VARCHAR(128),
  correlation_id VARCHAR(128),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connector_audit_idem
  ON connector_audit(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_connector_audit_tenant ON connector_audit(tenant_id, created_at DESC);

-- Wave 5 enterprise notifications (008 already owns observability notification_channels)
CREATE TABLE IF NOT EXISTS enterprise_notification_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  channel_type VARCHAR(32) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_ref UUID,
  severity_routes JSONB NOT NULL DEFAULT '["critical","high","medium","low","info"]'::jsonb,
  template JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enterprise_notification_channels_type_chk CHECK (
    channel_type IN ('email','slack','teams','webhook')
  )
);
CREATE INDEX IF NOT EXISTS idx_ent_notify_channels_tenant ON enterprise_notification_channels(tenant_id);

CREATE TABLE IF NOT EXISTS enterprise_notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES enterprise_notification_channels(id) ON DELETE CASCADE,
  severity VARCHAR(32) NOT NULL DEFAULT 'info',
  subject VARCHAR(512),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  CONSTRAINT enterprise_notification_deliveries_status_chk CHECK (
    status IN ('queued','sending','delivered','failed','dead_letter')
  )
);
CREATE INDEX IF NOT EXISTS idx_ent_notify_deliveries_tenant ON enterprise_notification_deliveries(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ent_notify_deliveries_status ON enterprise_notification_deliveries(tenant_id, status);

CREATE TABLE IF NOT EXISTS identity_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  protocol VARCHAR(32) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_ref UUID,
  role_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  attribute_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  group_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  jit_provisioning BOOLEAN NOT NULL DEFAULT TRUE,
  sso_provider_id UUID REFERENCES sso_providers(id) ON DELETE SET NULL,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name),
  CONSTRAINT identity_providers_protocol_chk CHECK (
    protocol IN ('ldap','active_directory','saml','oidc')
  )
);
CREATE INDEX IF NOT EXISTS idx_identity_providers_tenant ON identity_providers(tenant_id);

CREATE TABLE IF NOT EXISTS identity_sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES identity_providers(id) ON DELETE CASCADE,
  job_type VARCHAR(32) NOT NULL DEFAULT 'users',
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  users_synced INTEGER NOT NULL DEFAULT 0,
  groups_synced INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT identity_sync_jobs_status_chk CHECK (
    status IN ('queued','running','completed','failed')
  )
);
CREATE INDEX IF NOT EXISTS idx_identity_sync_jobs_tenant ON identity_sync_jobs(tenant_id, started_at DESC);

CREATE TABLE IF NOT EXISTS itsm_correlation_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES integration_connectors(id) ON DELETE CASCADE,
  external_system VARCHAR(64) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  correlation_id VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL DEFAULT 'incident',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, connector_id, external_system, external_id)
);
CREATE INDEX IF NOT EXISTS idx_itsm_correlation_tenant ON itsm_correlation_map(tenant_id, correlation_id);
