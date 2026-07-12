-- 048_ede_enterprise_demo.sql
-- Enterprise Demo Experience (EDE v1.0) — inventory summaries + guided evaluation metadata.
-- Does not invent product modules; additive tables only.

CREATE TABLE IF NOT EXISTS ede_inventory_summary (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL DEFAULT 'Asoftech Global Bank (Demo)',
  business_services INT NOT NULL DEFAULT 0,
  applications INT NOT NULL DEFAULT 0,
  servers INT NOT NULL DEFAULT 0,
  databases INT NOT NULL DEFAULT 0,
  kubernetes_clusters INT NOT NULL DEFAULT 0,
  cloud_resources INT NOT NULL DEFAULT 0,
  network_devices INT NOT NULL DEFAULT 0,
  apis INT NOT NULL DEFAULT 0,
  business_owners INT NOT NULL DEFAULT 0,
  environments TEXT[] NOT NULL DEFAULT ARRAY['Prod','UAT','DR'],
  illustrative BOOLEAN NOT NULL DEFAULT true,
  loaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pack_version TEXT NOT NULL DEFAULT 'ede-v1.0',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS ede_executive_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  availability NUMERIC(6,3) NOT NULL,
  revenue_at_risk NUMERIC(14,2) NOT NULL DEFAULT 0,
  compliance_score NUMERIC(5,2) NOT NULL,
  sustainability_score NUMERIC(5,2) NOT NULL,
  active_incidents INT NOT NULL DEFAULT 0,
  open_alerts INT NOT NULL DEFAULT 0,
  mttr_minutes NUMERIC(8,2) NOT NULL DEFAULT 0,
  sla_compliance NUMERIC(5,2) NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, day)
);

CREATE INDEX IF NOT EXISTS idx_ede_exec_daily_tenant_day
  ON ede_executive_daily (tenant_id, day DESC);

CREATE TABLE IF NOT EXISTS ede_guided_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  business_value TEXT NOT NULL,
  talk_track TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO ede_guided_steps (code, title, path, business_value, talk_track, sort_order)
VALUES
  ('exec-home', 'Executive Home', '/dashboard',
   'See enterprise health, revenue risk, and narrative in under 30 seconds.',
   'Open with availability, revenue-at-risk, and the executive narrative. Call out illustrative demo badges.',
   1),
  ('service-health', 'Business Service Health', '/dashboard',
   'Connect operational signals to customer-facing journeys and SLA tiers.',
   'Drill into UPI / Digital Banking / CBS rows — show tier, SLA, and investigate actions.',
   2),
  ('discovery', 'Discovery', '/discovery',
   'Prove coverage across cloud, data center, and hybrid estates.',
   'Show multi-cloud connectors, success rate, and pending discoveries.',
   3),
  ('cmdb', 'CMDB', '/cmdb',
   'Give buyers a trusted system of record for assets and owners.',
   'Filter by type/environment; open a CI and highlight owner + risk + compliance.',
   4),
  ('drift', 'CMDB Drift', '/cmdb/drift',
   'Differentiate inventory from change detection and control.',
   'Walk a firewall / cert / K8s drift event — severity, impact, recommended action.',
   5),
  ('twin', 'Digital Twin', '/twin',
   'Make blast radius tangible for executives and SRE leads.',
   'Select UPI Payments, run blast radius, highlight dependent databases and APIs.',
   6),
  ('topology', 'Live Topology', '/topology',
   'Show multi-region / multi-cloud operational graph without raw JSON.',
   'Switch layers; click a load balancer and API gateway node for details.',
   7),
  ('banking360', 'Banking360', '/banking360',
   'Industry depth for BFSI evaluations — rails, TPS, SLA, revenue impact.',
   'Highlight UPI latency/success and failed transaction revenue impact.',
   8),
  ('security', 'Security Center', '/security',
   'CISO-ready posture: MFA, sessions, certificates, risk timeline.',
   'Show security score, expired certificates, and recent logins.',
   9),
  ('copilot', 'AI Copilot', '/demo/guided',
   'Demonstrate guided investigation without requiring live telemetry.',
   'Use suggested prompts: UPI latency, certificate expiry, capacity risk.',
   10),
  ('reports', 'Executive Report', '/reports',
   'Leave with board-ready artifacts — charts and summaries, not dumps.',
   'Generate Executive Summary; show TrustBar freshness and export path.',
   11)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  path = EXCLUDED.path,
  business_value = EXCLUDED.business_value,
  talk_track = EXCLUDED.talk_track,
  sort_order = EXCLUDED.sort_order,
  enabled = true;

INSERT INTO demo_tours (code, title, industry, steps, enabled)
SELECT
  'ede-15min',
  'Enterprise Demo Experience (15 min)',
  'banking',
  '[
    {"path":"/dashboard","title":"Executive Home"},
    {"path":"/discovery","title":"Discovery"},
    {"path":"/cmdb","title":"CMDB"},
    {"path":"/cmdb/drift","title":"CMDB Drift"},
    {"path":"/twin","title":"Digital Twin"},
    {"path":"/topology","title":"Live Topology"},
    {"path":"/banking360","title":"Banking360"},
    {"path":"/security","title":"Security Center"},
    {"path":"/itsm","title":"ITSM"},
    {"path":"/reports","title":"Executive Report"}
  ]'::jsonb,
  true
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'demo_tours')
  AND NOT EXISTS (SELECT 1 FROM demo_tours WHERE code = 'ede-15min');

INSERT INTO feature_flags (tenant_id, flag_key, enabled, payload)
SELECT NULL, 'ede.pack', true, '{"version":"ede-v1.0","label":"Enterprise Demo Experience"}'::jsonb
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'feature_flags')
  AND NOT EXISTS (SELECT 1 FROM feature_flags WHERE tenant_id IS NULL AND flag_key = 'ede.pack');
