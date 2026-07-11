-- 039_wave7_certification.sql — Phase 5 Wave 7 Enterprise Certification & Production Validation
-- Additive only. Does not modify Waves 1–6 tables/contracts.

CREATE TABLE IF NOT EXISTS certification_suites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  suite_key VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT certification_suites_key_chk CHECK (
    suite_key IN (
      'performance','load','ha','chaos','security','scalability',
      'operational','reliability','reports'
    )
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certification_suites_key
  ON certification_suites(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'), suite_key);

CREATE TABLE IF NOT EXISTS certification_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  suite_key VARCHAR(64) NOT NULL,
  run_type VARCHAR(64) NOT NULL DEFAULT 'certification',
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  environment JSONB NOT NULL DEFAULT '{}'::jsonb,
  passed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  executed_by UUID,
  notes TEXT,
  CONSTRAINT certification_runs_status_chk CHECK (
    status IN ('running','passed','failed','partial','attested')
  )
);
CREATE INDEX IF NOT EXISTS idx_certification_runs_suite ON certification_runs(suite_key, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_certification_runs_tenant ON certification_runs(tenant_id, started_at DESC);

CREATE TABLE IF NOT EXISTS certification_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  report_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  run_ids UUID[] NOT NULL DEFAULT '{}',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_status VARCHAR(32) NOT NULL DEFAULT 'draft',
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT certification_reports_type_chk CHECK (
    report_type IN (
      'performance','scalability','security','ha','chaos',
      'certification','operational_readiness','reliability','load'
    )
  ),
  CONSTRAINT certification_reports_status_chk CHECK (
    overall_status IN ('draft','certified','failed','partial')
  )
);
CREATE INDEX IF NOT EXISTS idx_certification_reports_type ON certification_reports(report_type, generated_at DESC);

CREATE TABLE IF NOT EXISTS load_test_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certification_run_id UUID REFERENCES certification_runs(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  profile VARCHAR(64) NOT NULL DEFAULT 'sustained',
  concurrency INTEGER NOT NULL,
  total_requests INTEGER NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  p50_ms NUMERIC(12,3),
  p95_ms NUMERIC(12,3),
  p99_ms NUMERIC(12,3),
  rps NUMERIC(12,3),
  cpu_pct NUMERIC(8,2),
  mem_mb NUMERIC(12,2),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT load_test_runs_profile_chk CHECK (
    profile IN ('sustained','burst','concurrent_users','connector','ingestion','custom')
  )
);

CREATE TABLE IF NOT EXISTS benchmark_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certification_run_id UUID REFERENCES certification_runs(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  target VARCHAR(64) NOT NULL,
  operation VARCHAR(128) NOT NULL,
  samples INTEGER NOT NULL DEFAULT 0,
  avg_ms NUMERIC(12,3),
  p95_ms NUMERIC(12,3),
  min_ms NUMERIC(12,3),
  max_ms NUMERIC(12,3),
  throughput_rps NUMERIC(12,3),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_target ON benchmark_results(target, created_at DESC);

CREATE TABLE IF NOT EXISTS chaos_experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certification_run_id UUID REFERENCES certification_runs(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  experiment_key VARCHAR(64) NOT NULL,
  target VARCHAR(128) NOT NULL,
  injection VARCHAR(128) NOT NULL,
  recovered BOOLEAN NOT NULL DEFAULT FALSE,
  recovery_ms INTEGER,
  data_loss BOOLEAN NOT NULL DEFAULT FALSE,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  CONSTRAINT chaos_experiments_key_chk CHECK (
    experiment_key IN (
      'kill_container','restart_service','db_restart','redis_restart',
      'kafka_restart','gateway_restart','worker_restart',
      'network_latency','packet_loss','slow_storage','disk_full_sim'
    )
  )
);

CREATE TABLE IF NOT EXISTS soak_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certification_run_id UUID REFERENCES certification_runs(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  planned_duration_sec INTEGER NOT NULL,
  actual_duration_sec INTEGER,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  checkpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  leak_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  CONSTRAINT soak_sessions_status_chk CHECK (
    status IN ('running','passed','failed','aborted','attested')
  )
);

-- Seed suite catalog (global)
INSERT INTO certification_suites (tenant_id, suite_key, title, description)
SELECT NULL, v.suite_key, v.title, v.description
FROM (VALUES
  ('performance','Enterprise Performance Certification','API/dashboard/search/discovery/CMDB/AI/Kafka/PostgreSQL benchmarks'),
  ('load','Load Testing','Concurrent users, sustained/burst traffic, connector & ingestion load'),
  ('ha','High Availability Validation','Node/pod/service restart and recovery drills'),
  ('chaos','Chaos Engineering','Controlled failure injection with recovery attestation'),
  ('security','Security Validation','AuthN/Z, RBAC, JWT, secrets, certs, sessions, audit, TLS, rate limits'),
  ('scalability','Scalability Certification','Large CMDB/topology/telemetry/connector/KG scale evidence'),
  ('operational','Operational Certification','Backup/restore/DR/air-gap/Helm/Docker/upgrade/rollback'),
  ('reliability','Reliability / Soak','Soak, leak signals, schedulers, long-running workflows'),
  ('reports','Enterprise Reports','Generated certification report pack')
) AS v(suite_key, title, description)
WHERE NOT EXISTS (
  SELECT 1 FROM certification_suites s WHERE s.suite_key = v.suite_key AND s.tenant_id IS NULL
);
