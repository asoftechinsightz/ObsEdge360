-- 040_wave8_release_candidate.sql — Phase 5 Wave 8 Release Candidate
-- Additive only. Does not modify Waves 1–7 contracts.

CREATE TABLE IF NOT EXISTS release_candidate_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  version VARCHAR(64) NOT NULL DEFAULT 'v1.0.0-rc1',
  channel VARCHAR(32) NOT NULL DEFAULT 'rc',
  status VARCHAR(32) NOT NULL DEFAULT 'prepared',
  packages JSONB NOT NULL DEFAULT '{}'::jsonb,
  docs_freeze JSONB NOT NULL DEFAULT '{}'::jsonb,
  openapi JSONB NOT NULL DEFAULT '{}'::jsonb,
  pilot JSONB NOT NULL DEFAULT '{}'::jsonb,
  known_limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT release_candidate_profiles_status_chk CHECK (
    status IN ('prepared','validated','pilot_ready','superseded')
  ),
  CONSTRAINT release_candidate_profiles_channel_chk CHECK (
    channel IN ('rc','ga','hotfix')
  )
);
CREATE INDEX IF NOT EXISTS idx_rc_profiles_version ON release_candidate_profiles(version);

CREATE TABLE IF NOT EXISTS release_install_attestations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES release_candidate_profiles(id) ON DELETE SET NULL,
  install_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'attested',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  attested_by UUID,
  attested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT release_install_type_chk CHECK (
    install_type IN (
      'docker_fresh','kubernetes_fresh','airgap','upgrade','rollback','demo'
    )
  ),
  CONSTRAINT release_install_status_chk CHECK (
    status IN ('attested','passed','failed','partial')
  )
);
CREATE INDEX IF NOT EXISTS idx_release_install_type ON release_install_attestations(install_type, attested_at DESC);

CREATE TABLE IF NOT EXISTS pilot_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  checklist_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'ready',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pilot_checklists_type_chk CHECK (
    checklist_type IN (
      'deployment','acceptance','rollback','support','escalation'
    )
  ),
  CONSTRAINT pilot_checklists_status_chk CHECK (
    status IN ('draft','ready','signed_off')
  )
);
CREATE INDEX IF NOT EXISTS idx_pilot_checklists_type ON pilot_checklists(checklist_type);

CREATE TABLE IF NOT EXISTS demo_environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  name VARCHAR(128) NOT NULL,
  dataset_version VARCHAR(64) NOT NULL DEFAULT 'rc1-demo',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  seed_script VARCHAR(255) NOT NULL DEFAULT 'scripts/demo-rc-seed.sh',
  status VARCHAR(32) NOT NULL DEFAULT 'configured',
  last_seeded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT demo_environments_status_chk CHECK (
    status IN ('configured','seeded','ready','retired')
  )
);

-- Seed RC profile + pilot checklists (idempotent)
INSERT INTO release_candidate_profiles (version, channel, status, packages, docs_freeze, known_limitations)
SELECT 'v1.0.0-rc1', 'rc', 'prepared',
  '{"dockerCompose":true,"helm":true,"airgap":true}'::jsonb,
  '{"path":"docs/Wave8","frozen":true}'::jsonb,
  '["Full-scale load/soak remain env-gated from Wave 7","Destructive chaos fills are operator-gated","GA tag v1.0.0 requires Wave 9 exit"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM release_candidate_profiles WHERE version = 'v1.0.0-rc1');

INSERT INTO pilot_checklists (checklist_type, title, items, status)
SELECT v.checklist_type, v.title, v.items::jsonb, 'ready'
FROM (VALUES
  ('deployment','Pilot Deployment Checklist','[
    {"id":"d1","text":"Confirm baseline tag v1.0.0-wave7 on rollback media","required":true},
    {"id":"d2","text":"Backup PostgreSQL and .env before install","required":true},
    {"id":"d3","text":"Install via Compose or Helm using published guides","required":true},
    {"id":"d4","text":"Run migrations through 040","required":true},
    {"id":"d5","text":"Smoke health/ready/live and Admin login","required":true}
  ]'),
  ('acceptance','Pilot Acceptance Checklist','[
    {"id":"a1","text":"AuthN/Z and RBAC verified","required":true},
    {"id":"a2","text":"Observability dashboards load","required":true},
    {"id":"a3","text":"CMDB/topology readable","required":true},
    {"id":"a4","text":"Backup certification recorded","required":true},
    {"id":"a5","text":"Wave 7 certification overview reachable","required":true}
  ]'),
  ('rollback','Pilot Rollback Plan','[
    {"id":"r1","text":"Stop app services","required":true},
    {"id":"r2","text":"git reset --hard v1.0.0-wave7 (or prior SHA)","required":true},
    {"id":"r3","text":"Restore .env from pre-deploy backup","required":true},
    {"id":"r4","text":"Restore DB only if schema drift requires it (040 additive)","required":true},
    {"id":"r5","text":"Recreate gateway/web/nginx and smoke","required":true}
  ]'),
  ('support','Pilot Support Guide','[
    {"id":"s1","text":"Collect /api/v1/health and container status","required":true},
    {"id":"s2","text":"Capture gateway logs (last 200 lines)","required":true},
    {"id":"s3","text":"Note tenant, time window, and failing route","required":true},
    {"id":"s4","text":"Open case with severity per escalation matrix","required":true}
  ]'),
  ('escalation','Escalation Procedures','[
    {"id":"e1","text":"Sev1 — platform down: page on-call SRE immediately","required":true},
    {"id":"e2","text":"Sev2 — major feature impaired: escalate within 30m","required":true},
    {"id":"e3","text":"Sev3 — workaround available: business hours","required":true},
    {"id":"e4","text":"Security incident: follow Security.md + audit export","required":true}
  ]')
) AS v(checklist_type, title, items)
WHERE NOT EXISTS (
  SELECT 1 FROM pilot_checklists p WHERE p.checklist_type = v.checklist_type AND p.tenant_id IS NULL
);

INSERT INTO demo_environments (name, dataset_version, config, status)
SELECT 'RC Customer Demo', 'rc1-demo',
  '{"org":"OpsEdge360 Demo","guides":["docs/Wave8/PilotGuide.md"],"seed":"scripts/demo-rc-seed.sh"}'::jsonb,
  'configured'
WHERE NOT EXISTS (SELECT 1 FROM demo_environments WHERE name = 'RC Customer Demo');
