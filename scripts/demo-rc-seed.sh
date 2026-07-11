#!/usr/bin/env bash
# Seed a reproducible RC demo dataset (idempotent).
# Usage: bash scripts/demo-rc-seed.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== RC demo seed ==="

docker exec -i opsedge360-postgres-1 psql -U trinetra -d trinetra360 <<'SQL'
-- Ensure demo business service exists for presentations
INSERT INTO business_services (tenant_id, name, tier, sla_target, revenue_per_hour)
SELECT t.id, 'OpsEdge360 RC Demo Service', 1, 99.9, 100000
FROM tenants t
WHERE t.slug = 'default'
  AND NOT EXISTS (
    SELECT 1 FROM business_services b WHERE b.tenant_id = t.id AND b.name = 'OpsEdge360 RC Demo Service'
  );

INSERT INTO configuration_items (
  tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score, ai_confidence_score,
  attributes, tags, discovered_at, last_seen_at
)
SELECT t.id, 'rc-demo-api-01', 'rc-demo-api-gateway', 'service', 'active', 99, 97, 5, 98,
  '{"role":"api-gateway","wave":"v1.0.0-rc1"}'::jsonb, ARRAY['demo','rc1','production'], NOW(), NOW()
FROM tenants t
WHERE t.slug = 'default'
  AND NOT EXISTS (
    SELECT 1 FROM configuration_items c WHERE c.external_id = 'rc-demo-api-01'
  );

UPDATE demo_environments
SET status = 'ready', last_seeded_at = NOW(),
    config = config || jsonb_build_object('seededAt', NOW()::text, 'wave', 'v1.0.0-rc1')
WHERE name = 'RC Customer Demo';
SQL

echo "DEMO_RC_SEED_OK"
