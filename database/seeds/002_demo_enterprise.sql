-- OpsEdge360 Phase 1 Demo Enterprise Seed
-- Run after 001_initial.sql

DO $$
DECLARE
  tid UUID;
  ci_web UUID;
  ci_db UUID;
  ci_api UUID;
  ci_k8s UUID;
  ci_fw UUID;
  svc_upi UUID;
BEGIN
  SELECT id INTO tid FROM tenants WHERE slug = 'default';

  -- Demo admin user
  INSERT INTO users (tenant_id, email, name, role)
  VALUES (tid, 'admin@trinetra360.local', 'Platform Admin', 'admin')
  ON CONFLICT (tenant_id, email) DO NOTHING;

  -- Business services
  INSERT INTO business_services (id, tenant_id, name, tier, sla_target, revenue_per_hour)
  VALUES (uuid_generate_v4(), tid, 'UPI Payments', 1, 99.95, 240000)
  RETURNING id INTO svc_upi;

  INSERT INTO business_services (tenant_id, name, tier, sla_target, revenue_per_hour) VALUES
    (tid, 'Digital Banking', 1, 99.90, 180000),
    (tid, 'Loan Processing', 2, 99.50, 45000),
    (tid, 'Core Banking', 1, 99.99, 500000);

  -- Configuration items (pre-seeded before discovery runs)
  INSERT INTO configuration_items (id, tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score, ai_confidence_score, attributes, tags, discovered_at, last_seen_at)
  VALUES (uuid_generate_v4(), tid, 'seed-web-01', 'web-server-01', 'server', 'active', 98, 95, 8, 96,
    '{"os":"RHEL 9","ip":"10.0.1.5","cpu_cores":16}'::jsonb, ARRAY['production','web'], NOW(), NOW())
  RETURNING id INTO ci_web;

  INSERT INTO configuration_items (id, tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score, ai_confidence_score, attributes, tags, discovered_at, last_seen_at)
  VALUES (uuid_generate_v4(), tid, 'seed-db-primary', 'payment-db-primary', 'database', 'active', 72, 88, 35, 99,
    '{"engine":"PostgreSQL 16","encryption_at_rest":true}'::jsonb, ARRAY['production','payments','tier-1'], NOW(), NOW())
  RETURNING id INTO ci_db;

  INSERT INTO configuration_items (id, tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score, ai_confidence_score, attributes, tags, discovered_at, last_seen_at)
  VALUES (uuid_generate_v4(), tid, 'seed-payment-api', 'payment-api', 'api', 'active', 92, 91, 15, 94,
    '{"framework":"NestJS","replicas":3}'::jsonb, ARRAY['microservice','payments'], NOW(), NOW())
  RETURNING id INTO ci_api;

  INSERT INTO configuration_items (id, tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score, ai_confidence_score, attributes, tags, discovered_at, last_seen_at)
  VALUES (uuid_generate_v4(), tid, 'seed-k8s-prod', 'k8s-prod-cluster', 'cloud_resource', 'active', 95, 91, 12, 98,
    '{"provider":"aws","region":"ap-south-1","version":"1.29"}'::jsonb, ARRAY['kubernetes','production'], NOW(), NOW())
  RETURNING id INTO ci_k8s;

  INSERT INTO configuration_items (id, tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score, ai_confidence_score, attributes, tags, discovered_at, last_seen_at)
  VALUES (uuid_generate_v4(), tid, 'seed-fw-edge', 'fw-edge-01', 'firewall', 'active', 100, 82, 20, 97,
    '{"vendor":"Palo Alto","model":"PA-5220"}'::jsonb, ARRAY['network','security','edge'], NOW(), NOW())
  RETURNING id INTO ci_fw;

  -- Relationships
  INSERT INTO relationships (tenant_id, source_ci_id, target_ci_id, relationship_type, strength, ai_confidence_score) VALUES
    (tid, ci_api, ci_db, 'depends_on', 'critical', 95),
    (tid, ci_api, ci_k8s, 'runs_on', 'normal', 99),
    (tid, ci_web, ci_fw, 'connects_to', 'normal', 90),
    (tid, ci_api, ci_web, 'calls', 'normal', 88);

  -- Service mapping
  INSERT INTO service_maps (service_id, ci_id, role) VALUES (svc_upi, ci_api, 'entry_point');

  -- Sample alerts
  INSERT INTO alerts (tenant_id, ci_id, severity, title, description, status) VALUES
    (tid, ci_db, 'high', 'Connection pool near capacity', 'DB pool at 92% for 10 minutes', 'open'),
    (tid, ci_api, 'medium', 'Elevated p99 latency', 'Payment API p99 at 1.8s', 'open');

  -- Sustainability sample
  INSERT INTO sustainability_metrics (tenant_id, ci_id, energy_kwh, carbon_kg, pue, renewable_pct) VALUES
    (tid, ci_k8s, 1250.5, 485.2, 1.45, 35.0);

END $$;
