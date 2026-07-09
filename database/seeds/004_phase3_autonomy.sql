-- Phase 3 seed data: OT zones, runbooks, fraud samples, sustainability
DO $$
DECLARE
  tid UUID;
  ci_db UUID;
  ci_api UUID;
  ci_k8s UUID;
  zone_prod UUID;
  rb_restart UUID;
BEGIN
  SELECT id INTO tid FROM tenants WHERE slug = 'default';
  SELECT id INTO ci_db FROM configuration_items WHERE tenant_id = tid AND ci_type = 'database' LIMIT 1;
  SELECT id INTO ci_api FROM configuration_items WHERE tenant_id = tid AND name ILIKE '%payment-api%' LIMIT 1;
  SELECT id INTO ci_k8s FROM configuration_items WHERE tenant_id = tid AND ci_type = 'cloud_resource' LIMIT 1;

  -- OT Safety Zones
  IF NOT EXISTS (SELECT 1 FROM ot_safety_zones WHERE tenant_id = tid) THEN
    INSERT INTO ot_safety_zones (tenant_id, name, zone_level, read_only, max_poll_rate_hz, requires_ot_engineer_approval) VALUES
      (tid, 'Production Floor', 'production', true, 0.5, true),
      (tid, 'Plant DMZ', 'dmz', true, 1.0, true),
      (tid, 'Engineering Lab', 'lab', true, 2.0, false);
  END IF;

  -- Remediation Runbooks
  IF NOT EXISTS (SELECT 1 FROM remediation_runbooks WHERE tenant_id = tid) THEN
    INSERT INTO remediation_runbooks (id, tenant_id, name, description, trigger_conditions, actions, risk_tier, auto_execute, ot_zone_safe)
    VALUES (uuid_generate_v4(), tid, 'Restart Payment API Pods',
      'Restart payment-api deployment when connection pool exhausted',
      '{"alert_title_contains":"connection pool","ci_type":"api"}'::jsonb,
      '[{"type":"k8s_rollout_restart","target":"payment-api","namespace":"production"}]'::jsonb,
      'medium', false, true)
    RETURNING id INTO rb_restart;

    INSERT INTO remediation_runbooks (tenant_id, name, description, trigger_conditions, actions, risk_tier, auto_execute, ot_zone_safe) VALUES
      (tid, 'Scale DB Connection Pool', 'Increase max connections on payment database',
       '{"metric":"db.pool.utilization","threshold":90}'::jsonb,
       '[{"type":"config_update","target":"payment-db","param":"max_connections","value":200}]'::jsonb,
       'high', false, false),
      (tid, 'Block Suspicious IP', 'Firewall block for fraud-detected source IP',
       '{"fraud_type":"api_abuse"}'::jsonb,
       '[{"type":"firewall_block","duration_minutes":60}]'::jsonb,
       'low', true, true);
  END IF;

  -- SIEM Integration placeholder
  IF NOT EXISTS (SELECT 1 FROM siem_integrations WHERE tenant_id = tid) THEN
    INSERT INTO siem_integrations (tenant_id, name, provider, webhook_url, enabled) VALUES
      (tid, 'Splunk Enterprise', 'splunk', 'https://splunk.example.com:8088/services/collector', false),
      (tid, 'Microsoft Sentinel', 'sentinel', NULL, false);
  END IF;

  -- Sample fraud alert
  IF NOT EXISTS (SELECT 1 FROM fraud_alerts WHERE tenant_id = tid) THEN
    INSERT INTO fraud_alerts (tenant_id, alert_type, severity, title, description, reason_codes, confidence_score, explainability) VALUES
      (tid, 'payment_velocity', 'high', 'Unusual UPI payment velocity detected',
       'Merchant M-2847 processed 12x normal transaction volume in 15 minutes',
       ARRAY['velocity_spike', 'merchant_segment_deviation', 'time_of_day_anomaly'],
       91, '{"baseline_tps":45,"observed_tps":540,"deviation":"12x","model":"adaptive_baseline_v2"}'::jsonb);
  END IF;

  -- Sample anomalies
  IF NOT EXISTS (SELECT 1 FROM anomalies WHERE tenant_id = tid) THEN
    INSERT INTO anomalies (tenant_id, ci_id, anomaly_type, metric_name, baseline_value, observed_value, deviation_sigma, severity) VALUES
      (tid, ci_db, 'infrastructure', 'connection_pool_utilization', 65.0, 98.0, 4.2, 'high'),
      (tid, ci_api, 'application', 'p99_latency_ms', 450.0, 1800.0, 3.8, 'medium');
  END IF;

  -- Sustainability rollups
  IF ci_k8s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sustainability_rollups WHERE tenant_id = tid) THEN
    INSERT INTO sustainability_rollups (tenant_id, ci_id, period_date, energy_kwh, carbon_kg, pue, renewable_pct, idle_resources, efficiency_score)
    VALUES (tid, ci_k8s, CURRENT_DATE, 1250.5, 485.2, 1.45, 35.0, 3, 72);

    INSERT INTO sustainability_recommendations (tenant_id, ci_id, recommendation_type, title, description, projected_savings_pct, projected_carbon_reduction_kg) VALUES
      (tid, ci_k8s, 'rightsizing', 'Rightsize idle worker nodes',
       '3 worker nodes at <5% CPU for 7 days. Recommend scale-down or spot instances.',
       18.5, 89.7),
      (tid, ci_k8s, 'scheduling', 'Shift batch workloads to low-carbon window',
       'Schedule non-critical batch jobs between 02:00-06:00 when grid carbon intensity is 40% lower.',
       12.0, 58.2);
  END IF;
END $$;
