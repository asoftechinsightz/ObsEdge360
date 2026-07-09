-- Phase 2 transaction templates and sample flows
DO $$
DECLARE
  tid UUID;
  svc_upi UUID;
  tx_upi UUID;
  ci_api UUID;
  ci_db UUID;
  ci_gw UUID;
BEGIN
  SELECT id INTO tid FROM tenants WHERE slug = 'default';
  SELECT id INTO svc_upi FROM business_services WHERE tenant_id = tid AND name = 'UPI Payments' LIMIT 1;
  SELECT id INTO ci_api FROM configuration_items WHERE tenant_id = tid AND name LIKE '%payment-api%' LIMIT 1;
  SELECT id INTO ci_db FROM configuration_items WHERE tenant_id = tid AND ci_type = 'database' LIMIT 1;
  SELECT id INTO ci_gw FROM configuration_items WHERE tenant_id = tid AND ci_type IN ('api','firewall') LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM business_transactions WHERE tenant_id = tid AND classification = 'upi_payment') THEN
    INSERT INTO business_transactions (tenant_id, service_id, name, classification, template_code, entry_ci_id, p50_latency_ms, p99_latency_ms, volume_per_hour)
    VALUES (tid, svc_upi, 'UPI Payment', 'upi_payment', 'BFSI-UPI', ci_api, 450, 1200, 125000)
    RETURNING id INTO tx_upi;

    INSERT INTO transaction_steps (transaction_id, step_order, step_type, name, ci_id, avg_latency_ms, p99_latency_ms, status) VALUES
      (tx_upi, 1, 'channel', 'Customer', NULL, 12, 25, 'ok'),
      (tx_upi, 2, 'channel', 'Mobile App', NULL, 45, 80, 'ok'),
      (tx_upi, 3, 'gateway', 'API Gateway', ci_gw, 8, 15, 'ok'),
      (tx_upi, 4, 'auth', 'Authentication', NULL, 120, 200, 'ok'),
      (tx_upi, 5, 'service', 'Payment Service', ci_api, 890, 1800, 'warn'),
      (tx_upi, 6, 'database', 'Database', ci_db, 34, 90, 'ok'),
      (tx_upi, 7, 'external', 'NPCI Switch', NULL, 210, 400, 'ok');
  END IF;

  -- NEFT template
  IF NOT EXISTS (SELECT 1 FROM business_transactions WHERE tenant_id = tid AND classification = 'neft_transfer') THEN
    INSERT INTO business_transactions (tenant_id, name, classification, template_code, p50_latency_ms, p99_latency_ms, volume_per_hour)
    VALUES (tid, 'NEFT Transfer', 'neft_transfer', 'BFSI-NEFT', 2000, 5000, 45000);
  END IF;

  -- Sample network flows
  IF ci_api IS NOT NULL AND ci_db IS NOT NULL AND NOT EXISTS (SELECT 1 FROM network_flows WHERE tenant_id = tid LIMIT 1) THEN
    INSERT INTO network_flows (tenant_id, src_ci_id, dst_ci_id, src_ip, dst_ip, src_port, dst_port, protocol, bytes, packets, latency_ms, jitter_ms, packet_loss_pct)
    VALUES
      (tid, ci_api, ci_db, '10.0.2.10'::inet, '10.0.2.20'::inet, 54321, 5432, 'TCP', 1048576, 1500, 2.4, 0.3, 0.01),
      (tid, ci_api, ci_db, '10.0.2.10'::inet, '10.0.2.20'::inet, 54322, 5432, 'TCP', 2097152, 3000, 3.1, 0.5, 0.02);
  END IF;
END $$;
