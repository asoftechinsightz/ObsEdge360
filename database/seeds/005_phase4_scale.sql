-- Phase 4 seed: industry packs, forecasts, quantum jobs, HA/DR, FedRAMP assessments
DO $$
DECLARE
  tid UUID;
  ci_db UUID;
  ci_api UUID;
  pack_bfsi UUID;
  pack_health UUID;
  region_primary UUID;
  region_dr UUID;
  fc_ac2 UUID;
BEGIN
  SELECT id INTO tid FROM tenants WHERE slug = 'default';
  SELECT id INTO ci_db FROM configuration_items WHERE tenant_id = tid AND ci_type = 'database' LIMIT 1;
  SELECT id INTO ci_api FROM configuration_items WHERE tenant_id = tid AND name ILIKE '%payment-api%' LIMIT 1;
  SELECT id INTO pack_bfsi FROM industry_packs WHERE code = 'bfsi';
  SELECT id INTO pack_health FROM industry_packs WHERE code = 'healthcare';

  -- Enable BFSI pack for default tenant
  IF pack_bfsi IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tenant_industry_packs WHERE tenant_id = tid AND pack_id = pack_bfsi) THEN
    INSERT INTO tenant_industry_packs (tenant_id, pack_id, enabled) VALUES (tid, pack_bfsi, true);
    INSERT INTO tenant_frameworks (tenant_id, framework_id, enabled)
    SELECT tid, f.id, true FROM compliance_frameworks f
    WHERE f.code IN (SELECT unnest(framework_codes) FROM industry_packs WHERE id = pack_bfsi)
    ON CONFLICT DO NOTHING;
  END IF;

  -- HA/DR regions
  IF NOT EXISTS (SELECT 1 FROM ha_dr_regions WHERE tenant_id = tid) THEN
    INSERT INTO ha_dr_regions (id, tenant_id, region_code, region_name, role, cloud_provider, rto_minutes, rpo_minutes, data_residency)
    VALUES (uuid_generate_v4(), tid, 'ap-south-1', 'Mumbai Primary', 'primary', 'aws', 30, 5, 'IN')
    RETURNING id INTO region_primary;

    INSERT INTO ha_dr_regions (tenant_id, region_code, region_name, role, cloud_provider, rto_minutes, rpo_minutes, data_residency)
    VALUES (tid, 'ap-south-2', 'Hyderabad DR', 'dr', 'aws', 60, 15, 'IN')
    RETURNING id INTO region_dr;

    INSERT INTO ha_dr_status (tenant_id, region_id, health_status, replication_lag_ms, last_failover_test, failover_test_result, active_services) VALUES
      (tid, region_primary, 'healthy', 12, NOW() - INTERVAL '7 days', 'pass', 9),
      (tid, region_dr, 'healthy', 45, NOW() - INTERVAL '14 days', 'pass', 9);
  END IF;

  -- Predictive forecasts
  IF NOT EXISTS (SELECT 1 FROM predictive_forecasts WHERE tenant_id = tid) THEN
    INSERT INTO predictive_forecasts (tenant_id, forecast_type, metric_name, ci_id, horizon_days, forecast_points, confidence_low, confidence_high, business_impact) VALUES
      (tid, 'capacity', 'cpu.utilization.pct', ci_api, 7,
       '[{"day":1,"value":72},{"day":2,"value":75},{"day":3,"value":78},{"day":4,"value":81},{"day":5,"value":84},{"day":6,"value":87},{"day":7,"value":91}]'::jsonb,
       '[{"day":1,"value":68},{"day":2,"value":70},{"day":3,"value":73},{"day":4,"value":76},{"day":5,"value":79},{"day":6,"value":82},{"day":7,"value":85}]'::jsonb,
       '[{"day":1,"value":76},{"day":2,"value":80},{"day":3,"value":83},{"day":4,"value":86},{"day":5,"value":89},{"day":6,"value":92},{"day":7,"value":97}]'::jsonb,
       '{"revenueAtRisk":125000,"slaBreachProbability":0.34}'::jsonb),
      (tid, 'incident', 'db.connection.pool.utilization', ci_db, 7,
       '[{"day":1,"value":65},{"day":2,"value":70},{"day":3,"value":74},{"day":4,"value":79},{"day":5,"value":85},{"day":6,"value":90},{"day":7,"value":95}]'::jsonb,
       '[{"day":1,"value":60},{"day":2,"value":65},{"day":3,"value":69},{"day":4,"value":74},{"day":5,"value":79},{"day":6,"value":84},{"day":7,"value":88}]'::jsonb,
       '[{"day":1,"value":70},{"day":2,"value":75},{"day":3,"value":79},{"day":4,"value":84},{"day":5,"value":91},{"day":6,"value":96},{"day":7,"value":102}]'::jsonb,
       '{"revenueAtRisk":340000,"slaBreachProbability":0.62}'::jsonb);
  END IF;

  -- Incident predictions
  IF NOT EXISTS (SELECT 1 FROM incident_predictions WHERE tenant_id = tid) THEN
    INSERT INTO incident_predictions (tenant_id, ci_id, incident_type, probability_pct, predicted_window_start, predicted_window_end, revenue_at_risk, affected_transactions, root_cause_hypothesis, confidence_pct) VALUES
      (tid, ci_db, 'connection_pool_exhaustion', 78, NOW() + INTERVAL '2 days', NOW() + INTERVAL '4 days', 340000,
       ARRAY['upi_payment', 'neft_transfer'], 'Connection pool saturation correlated with UPI volume spike (+34% WoW)', 82),
      (tid, ci_api, 'latency_degradation', 54, NOW() + INTERVAL '5 days', NOW() + INTERVAL '7 days', 125000,
       ARRAY['upi_payment'], 'CPU saturation forecast exceeds 90% threshold by day 7', 71);
  END IF;

  -- Quantum jobs
  IF NOT EXISTS (SELECT 1 FROM quantum_jobs WHERE tenant_id = tid) THEN
    INSERT INTO quantum_jobs (tenant_id, external_job_id, provider, job_type, algorithm, qubits_used, circuit_depth, status, classical_runtime_ms, quantum_runtime_ms, result_summary) VALUES
      (tid, 'ibm-q-2847', 'ibm_quantum', 'optimization', 'QAOA', 127, 48, 'completed', 1240, 320,
       '{"objective":"portfolio_risk_minimization","improvement_pct":12.4}'::jsonb),
      (tid, 'aws-braket-991', 'aws_braket', 'simulation', 'VQE', 32, 24, 'running', 890, NULL,
       '{"molecule":"drug_candidate_A","energy_estimate":null}'::jsonb),
      (tid, 'azure-qdk-112', 'azure_quantum', 'hybrid', 'Grover', 20, 16, 'queued', 0, NULL,
       '{"search_space":"credential_hash_audit","status":"pending"}'::jsonb);
  END IF;

  -- Quantum readiness assessment
  IF NOT EXISTS (SELECT 1 FROM quantum_readiness WHERE tenant_id = tid) THEN
    INSERT INTO quantum_readiness (tenant_id, assessment_type, score, pqc_algorithms_adopted, tls_pqc_ready, key_rotation_days, findings, recommendations) VALUES
      (tid, 'pqc_migration', 68, ARRAY['ML-KEM-768', 'ML-DSA-65'], false, 90,
       '[{"area":"tls","status":"partial","detail":"Legacy RSA-2048 still on 23% of endpoints"},{"area":"signing","status":"good","detail":"ML-DSA adopted for internal JWT"}]'::jsonb,
       '[{"priority":"high","action":"Enable hybrid TLS with ML-KEM on API gateway"},{"priority":"medium","action":"Inventory quantum-vulnerable algorithms across CMDB"}]'::jsonb);
  END IF;

  -- FedRAMP assessments
  IF NOT EXISTS (SELECT 1 FROM fedramp_assessments WHERE tenant_id = tid) THEN
    FOR fc_ac2 IN SELECT id FROM fedramp_controls LOOP
      INSERT INTO fedramp_assessments (tenant_id, control_id, status, score, evidence_links)
      VALUES (tid, fc_ac2,
        CASE WHEN random() > 0.3 THEN 'implemented' WHEN random() > 0.15 THEN 'partial' ELSE 'planned' END,
        70 + floor(random() * 30)::int,
        '[{"type":"audit_log","ref":"audit_log table"},{"type":"policy","ref":"docs/architecture/17-SECURITY-ARCHITECTURE.md"}]'::jsonb);
    END LOOP;
  END IF;
END $$;
