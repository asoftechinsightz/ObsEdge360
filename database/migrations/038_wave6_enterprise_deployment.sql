-- 038_wave6_enterprise_deployment.sql — Phase 5 Wave 6 Enterprise Deployment & Security Hardening
-- Additive only. Does not rename/drop Wave 1–5 tables.

-- Air-gap / offline package manifests
CREATE TABLE IF NOT EXISTS airgap_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  package_name VARCHAR(255) NOT NULL,
  version VARCHAR(64) NOT NULL,
  checksum_sha256 VARCHAR(128) NOT NULL,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_digests JSONB NOT NULL DEFAULT '[]'::jsonb,
  offline_docs BOOLEAN NOT NULL DEFAULT TRUE,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_airgap_packages_version ON airgap_packages(version);

-- Backup schedules & certification
CREATE TABLE IF NOT EXISTS backup_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target VARCHAR(64) NOT NULL DEFAULT 'postgresql',
  cron_expr VARCHAR(64) NOT NULL DEFAULT '0 2 * * *',
  retention_days INTEGER NOT NULL DEFAULT 14,
  encrypt BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT backup_schedules_target_chk CHECK (
    target IN ('postgresql','redis','kafka','configuration','full')
  )
);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_tenant ON backup_schedules(tenant_id);

CREATE TABLE IF NOT EXISTS backup_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  backup_run_id UUID REFERENCES backup_runs(id) ON DELETE SET NULL,
  artifact_path TEXT NOT NULL,
  checksum_sha256 VARCHAR(128) NOT NULL,
  size_bytes BIGINT,
  integrity_ok BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  certified_by UUID,
  certified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_backup_certifications_tenant ON backup_certifications(tenant_id, certified_at DESC);

CREATE TABLE IF NOT EXISTS restore_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  restore_type VARCHAR(64) NOT NULL DEFAULT 'full',
  source_artifact TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'attested',
  validation_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  point_in_time TIMESTAMPTZ,
  attested_by UUID,
  attested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT restore_certifications_type_chk CHECK (
    restore_type IN ('full','partial','configuration','database','pit')
  ),
  CONSTRAINT restore_certifications_status_chk CHECK (
    status IN ('attested','validated','failed')
  )
);
CREATE INDEX IF NOT EXISTS idx_restore_certifications_tenant ON restore_certifications(tenant_id, attested_at DESC);

-- Secret rotation productization
CREATE TABLE IF NOT EXISTS secret_rotation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  secret_id UUID NOT NULL,
  schedule_cron VARCHAR(64) NOT NULL DEFAULT '0 3 * * 0',
  rotate_after_days INTEGER,
  notify_before_days INTEGER NOT NULL DEFAULT 14,
  auto_rotate BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_rotated_at TIMESTAMPTZ,
  last_status VARCHAR(32) NOT NULL DEFAULT 'idle',
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_secret_rotation_jobs_tenant ON secret_rotation_jobs(tenant_id);

CREATE TABLE IF NOT EXISTS secret_rotation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES secret_rotation_jobs(id) ON DELETE SET NULL,
  secret_id UUID,
  event_type VARCHAR(64) NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_secret_rotation_events_tenant ON secret_rotation_events(tenant_id, created_at DESC);

-- Enterprise edge/TLS certificate inventory (additive to trust_certificates)
CREATE TABLE IF NOT EXISTS enterprise_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  purpose VARCHAR(64) NOT NULL DEFAULT 'tls',
  subject_cn VARCHAR(512),
  fingerprint_sha256 VARCHAR(128),
  not_before TIMESTAMPTZ,
  not_after TIMESTAMPTZ,
  pem_public TEXT,
  secret_ref UUID,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  last_validated_at TIMESTAMPTZ,
  validation_ok BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT enterprise_certificates_status_chk CHECK (
    status IN ('active','expiring','expired','revoked','pending')
  )
);
CREATE INDEX IF NOT EXISTS idx_enterprise_certificates_tenant ON enterprise_certificates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_certificates_expiry ON enterprise_certificates(tenant_id, not_after);

-- Deployment profile / k8s attestation metadata
CREATE TABLE IF NOT EXISTS deployment_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  profile_name VARCHAR(128) NOT NULL,
  mode VARCHAR(64) NOT NULL DEFAULT 'onprem',
  kubernetes VARCHAR(128) DEFAULT 'opsedge360',
  helm_release VARCHAR(128),
  values_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  airgap BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL DEFAULT 'configured',
  last_health JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deployment_profiles_tenant ON deployment_profiles(tenant_id);

-- Enhance default security policy configs for new tenants (merge-safe; do not overwrite custom)
UPDATE security_policies
SET config = config || jsonb_build_object(
  'reusePrevention', COALESCE(config->'reusePrevention', 'true'::jsonb),
  'historyCount', COALESCE(config->'historyCount', '5'::jsonb),
  'expiryDays', COALESCE(config->'expiryDays', '90'::jsonb),
  'adminOverride', COALESCE(config->'adminOverride', 'true'::jsonb)
),
updated_at = NOW()
WHERE policy_type = 'password'
  AND NOT (config ? 'expiryDays');

UPDATE security_policies
SET config = config || jsonb_build_object(
  'idleTimeoutMinutes', COALESCE(config->'idleTimeoutMinutes', '30'::jsonb),
  'absoluteTimeoutHours', COALESCE(config->'absoluteTimeoutHours', '12'::jsonb),
  'maxConcurrentSessions', COALESCE(config->'maxConcurrentSessions', '5'::jsonb),
  'deviceTracking', COALESCE(config->'deviceTracking', 'true'::jsonb),
  'forcedLogoutEnabled', COALESCE(config->'forcedLogoutEnabled', 'true'::jsonb),
  'sessionAudit', COALESCE(config->'sessionAudit', 'true'::jsonb)
),
updated_at = NOW()
WHERE policy_type = 'session'
  AND NOT (config ? 'absoluteTimeoutHours');
