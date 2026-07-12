#!/usr/bin/env bash
# Phase 2 enterprise demo seed — realistic multi-industry dataset (idempotent).
# Targets DEMO database only. Refuses to run when APP_ENV=production.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ "${APP_ENV:-}" = "production" ] || [ "${OPS_EDGE_ENV:-}" = "production" ]; then
  echo "REFUSE: will not seed production plane"
  exit 1
fi

PG_CONTAINER="${DEMO_PG_CONTAINER:-opsedge360-postgres-demo-1}"
PG_USER="${DEMO_POSTGRES_USER:-opsedge_demo}"
PG_DB="${DEMO_POSTGRES_DB:-opsedge360_demo}"

# Fallback to primary compose postgres when demo container absent (local/dev only)
if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  if [ "${ALLOW_DEMO_SEED_ON_PRIMARY:-}" = "true" ]; then
    PG_CONTAINER="${PG_CONTAINER_FALLBACK:-opsedge360-postgres-1}"
    PG_USER="${POSTGRES_USER:-trinetra}"
    PG_DB="${POSTGRES_DB:-trinetra360}"
    echo "WARN: seeding primary container $PG_CONTAINER (ALLOW_DEMO_SEED_ON_PRIMARY=true)"
  else
    echo "FAIL: demo postgres container $PG_CONTAINER not running"
    echo "Start: docker compose -f docker-compose.yml -f docker-compose.demo.yml --profile demo up -d postgres-demo"
    exit 1
  fi
fi

echo "=== Phase 2 demo seed → $PG_CONTAINER / $PG_DB ==="

docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" <<'SQL'
-- Tenants / orgs
INSERT INTO tenants (name, slug)
SELECT v.name, v.slug FROM (VALUES
  ('Asoftech National Bank', 'demo-banking'),
  ('Insightz Health Systems', 'demo-healthcare'),
  ('EdgeForge Industries', 'demo-manufacturing'),
  ('OmniCart Retail Group', 'demo-retail')
) AS v(name, slug)
WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.slug = v.slug);

-- Demo persona users (password hash placeholder — set via reset in controlled demos)
-- Roles: admin remains for CIO tenant admins; others use operator/viewer labels in JWT via role column
DO $$
DECLARE
  t RECORD;
  personas TEXT[][] := ARRAY[
    ARRAY['cio','Demo CIO','cio@demo.opsedge360.local','admin'],
    ARRAY['cto','Demo CTO','cto@demo.opsedge360.local','admin'],
    ARRAY['ciso','Demo CISO','ciso@demo.opsedge360.local','admin'],
    ARRAY['noc','Demo NOC Engineer','noc@demo.opsedge360.local','operator'],
    ARRAY['soc','Demo SOC Analyst','soc@demo.opsedge360.local','operator'],
    ARRAY['ops','Demo Operations Manager','ops@demo.opsedge360.local','operator'],
    ARRAY['exec','Demo Executive Viewer','exec@demo.opsedge360.local','viewer']
  ];
  p TEXT[];
BEGIN
  FOR t IN SELECT id, slug FROM tenants WHERE slug LIKE 'demo-%' LOOP
    FOREACH p SLICE 1 IN ARRAY personas LOOP
      INSERT INTO users (tenant_id, email, name, role, password_hash)
      SELECT t.id, replace(p[3], '@demo.', '@' || t.slug || '.'), p[2] || ' (' || t.slug || ')', p[4],
             '$2b$10$demo.placeholder.hash.not.for.login.use.reset'
      WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.tenant_id = t.id AND u.email = replace(p[3], '@demo.', '@' || t.slug || '.')
      );
    END LOOP;
  END LOOP;
END $$;

-- Infrastructure CIs per industry
INSERT INTO configuration_items (
  tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score, ai_confidence_score,
  attributes, tags, discovered_at, last_seen_at
)
SELECT t.id,
       t.slug || '-k8s-prod-01',
       t.slug || ' production cluster',
       'cloud_resource',
       'active',
       92 + (random()*5)::int,
       90,
       12,
       95,
       jsonb_build_object('industry', replace(t.slug, 'demo-', ''), 'kind', 'kubernetes', 'region', 'ap-south-1', 'nodes', 12 + (random()*8)::int),
       ARRAY['demo','kubernetes','phase2'],
       NOW() - interval '30 days',
       NOW()
FROM tenants t
WHERE t.slug LIKE 'demo-%'
  AND NOT EXISTS (SELECT 1 FROM configuration_items c WHERE c.external_id = t.slug || '-k8s-prod-01');

INSERT INTO configuration_items (
  tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score, ai_confidence_score,
  attributes, tags, discovered_at, last_seen_at
)
SELECT t.id,
       t.slug || '-app-' || g.i,
       initcap(replace(t.slug, 'demo-', '')) || ' App ' || g.i,
       'service',
       'active',
       85 + (random()*10)::int,
       88,
       8 + (random()*10)::int,
       90,
       jsonb_build_object('tier', CASE WHEN g.i=1 THEN 'critical' ELSE 'standard' END, 'runtime', 'nodejs'),
       ARRAY['demo','application','phase2'],
       NOW() - interval '14 days',
       NOW()
FROM tenants t
CROSS JOIN generate_series(1, 25) AS g(i)
WHERE t.slug LIKE 'demo-%'
  AND NOT EXISTS (SELECT 1 FROM configuration_items c WHERE c.external_id = t.slug || '-app-' || g.i);

INSERT INTO configuration_items (
  tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score, ai_confidence_score,
  attributes, tags, discovered_at, last_seen_at
)
SELECT t.id,
       t.slug || '-srv-' || g.i,
       'srv-' || t.slug || '-' || lpad(g.i::text, 3, '0'),
       'server',
       'active',
       80 + (random()*15)::int,
       85,
       10,
       88,
       jsonb_build_object('os', 'linux', 'cpu', 8, 'mem_gb', 32),
       ARRAY['demo','server','phase2'],
       NOW() - interval '60 days',
       NOW()
FROM tenants t
CROSS JOIN generate_series(1, 40) AS g(i)
WHERE t.slug LIKE 'demo-%'
  AND NOT EXISTS (SELECT 1 FROM configuration_items c WHERE c.external_id = t.slug || '-srv-' || g.i);

-- Business services
INSERT INTO business_services (tenant_id, name, tier, sla_target, revenue_per_hour)
SELECT t.id, initcap(replace(t.slug,'demo-','')) || ' Customer Journey', 1, 99.9, 250000
FROM tenants t
WHERE t.slug LIKE 'demo-%'
  AND NOT EXISTS (
    SELECT 1 FROM business_services b WHERE b.tenant_id = t.id AND b.name LIKE '%Customer Journey'
  );

-- Ops incidents sample
INSERT INTO ops_incidents (tenant_id, title, severity, status, window_start, window_end, signal_counts, blast_summary, correlation_key)
SELECT t.id,
       'Elevated latency on ' || initcap(replace(t.slug,'demo-','')) || ' checkout path',
       'high',
       'open',
       NOW() - interval '45 minutes',
       NOW() + interval '2 hours',
       '{"alerts":3,"anomalies":1}'::jsonb,
       '{"summary":"Synthetic and APM signals correlated; awaiting RCA"}'::jsonb,
       'demo-latency-' || t.slug
FROM tenants t
WHERE t.slug LIKE 'demo-%'
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ops_incidents')
  AND NOT EXISTS (
    SELECT 1 FROM ops_incidents i WHERE i.tenant_id = t.id AND i.correlation_key = 'demo-latency-' || t.slug
  );

-- ITSM foundation samples
INSERT INTO itsm_problems (tenant_id, number, title, status, priority)
SELECT t.id, 'PRB-' || upper(substr(t.slug,6,3)) || '-1001', 'Recurring checkout latency', 'open', 'high'
FROM tenants t WHERE t.slug LIKE 'demo-%'
  AND NOT EXISTS (SELECT 1 FROM itsm_problems p WHERE p.tenant_id=t.id AND p.number LIKE 'PRB-%1001');

INSERT INTO itsm_changes (tenant_id, number, title, status, risk, cab_required, scheduled_start, scheduled_end)
SELECT t.id, 'CHG-' || upper(substr(t.slug,6,3)) || '-2001', 'Scale checkout pods', 'scheduled', 'medium', true,
       NOW() + interval '2 days', NOW() + interval '2 days 2 hours'
FROM tenants t WHERE t.slug LIKE 'demo-%'
  AND NOT EXISTS (SELECT 1 FROM itsm_changes c WHERE c.tenant_id=t.id AND c.number LIKE 'CHG-%2001');

INSERT INTO itsm_knowledge_articles (tenant_id, title, body, tags, published)
SELECT t.id, 'Runbook: checkout latency', '1. Check synthetics 2. Review APM 3. Scale pods 4. Verify SLO',
       ARRAY['demo','runbook'], true
FROM tenants t WHERE t.slug LIKE 'demo-%'
  AND NOT EXISTS (SELECT 1 FROM itsm_knowledge_articles k WHERE k.tenant_id=t.id AND k.title LIKE 'Runbook:%');

INSERT INTO itsm_service_catalog_items (tenant_id, name, description, category)
SELECT t.id, 'Request capacity increase', 'Standard capacity change request', 'infrastructure'
FROM tenants t WHERE t.slug LIKE 'demo-%'
  AND NOT EXISTS (SELECT 1 FROM itsm_service_catalog_items s WHERE s.tenant_id=t.id AND s.name='Request capacity increase');

UPDATE demo_organizations SET last_refreshed_at = NOW(), status='ready';

INSERT INTO demo_refresh_runs (environment_code, status, records_seeded, detail, completed_at)
VALUES ('demo', 'completed',
  (SELECT COUNT(*)::int FROM configuration_items WHERE 'demo' = ANY(tags)),
  '{"script":"phase2-demo-seed.sh"}'::jsonb, NOW());
SQL

echo "PHASE2_DEMO_SEED_OK"
