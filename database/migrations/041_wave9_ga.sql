-- 041_wave9_ga.sql — Phase 5 Wave 9 General Availability
-- Additive only. Final GA sign-off metadata. No Wave 1–8 contract changes.

CREATE TABLE IF NOT EXISTS ga_releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(64) NOT NULL DEFAULT 'v1.0.0',
  status VARCHAR(32) NOT NULL DEFAULT 'prepared',
  baseline_rc VARCHAR(64) NOT NULL DEFAULT 'v1.0.0-rc1',
  production_sha VARCHAR(64),
  validation_token VARCHAR(64),
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  sbom JSONB NOT NULL DEFAULT '{}'::jsonb,
  readiness JSONB NOT NULL DEFAULT '{}'::jsonb,
  known_limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ga_releases_status_chk CHECK (
    status IN ('prepared','validated','approved','released','superseded')
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ga_releases_version ON ga_releases(version);

CREATE TABLE IF NOT EXISTS ga_regression_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ga_release_id UUID REFERENCES ga_releases(id) ON DELETE SET NULL,
  module_key VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'passed',
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ga_regression_status_chk CHECK (
    status IN ('passed','failed','partial','skipped')
  )
);
CREATE INDEX IF NOT EXISTS idx_ga_regression_module ON ga_regression_runs(module_key, executed_at DESC);

CREATE TABLE IF NOT EXISTS ga_signoffs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ga_release_id UUID REFERENCES ga_releases(id) ON DELETE CASCADE,
  report_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'approved',
  signed_by UUID,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ga_signoffs_type_chk CHECK (
    report_type IN (
      'readiness','production_validation','release_approval',
      'version_manifest','sbom','support_readiness'
    )
  )
);

INSERT INTO ga_releases (version, status, baseline_rc, validation_token, known_limitations, readiness)
SELECT 'v1.0.0', 'prepared', 'v1.0.0-rc1', NULL,
  '[
    "Full-scale load (1k/10k) and 24h soak remain available via CERT_FULL_SCALE / CERT_SOAK_SECONDS",
    "Destructive disk-full / packet-loss chaos remains operator-gated",
    "Customer K8s install requires cluster-admin outside the Compose production path"
  ]'::jsonb,
  '{"wave":"9","phase":"GA","docs":"docs/Wave9"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ga_releases WHERE version = 'v1.0.0');
