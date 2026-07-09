-- OpsEdge360 Sprint 8 — Banking360 RBI / PCI controls
-- Version: 011

-- RBI Cyber Security Framework controls (representative)
INSERT INTO compliance_controls (framework_id, control_id, title, description, validation_query, severity)
SELECT f.id, v.control_id, v.title, v.description, v.validation_query::jsonb, v.severity
FROM compliance_frameworks f
CROSS JOIN (VALUES
  ('RBI-1.1', 'IT Governance', 'Board-approved IT policy and governance structure',
   '{"type":"cmdb_count","filter":{},"pass_condition":"count > 0","message":"No assets registered for governance scope"}', 'high'),
  ('RBI-2.1', 'Access Control', 'Role-based access and privileged account management',
   '{"type":"cmdb_query","filter":{"owner_id":null},"pass_condition":"count == 0","message":"Assets without owners detected"}', 'critical'),
  ('RBI-3.1', 'Network Security', 'Segmented network and perimeter controls',
   '{"type":"cmdb_query","filter":{"ci_type":"firewall"},"pass_condition":"count > 0","message":"No firewall CIs discovered"}', 'high'),
  ('RBI-4.1', 'Application Security', 'Secure SDLC and vulnerability management',
   '{"type":"cmdb_query","filter":{"ci_type":"application"},"pass_condition":"count > 0","message":"No applications in CMDB"}', 'high'),
  ('RBI-5.1', 'Incident Response', 'Documented IR plan and monitoring',
   '{"type":"cmdb_count","filter":{},"pass_condition":"count > 0","message":"Insufficient monitoring footprint"}', 'critical'),
  ('RBI-6.1', 'Business Continuity', 'BCP/DR for critical payment systems',
   '{"type":"cmdb_query","filter":{"ci_type":"service"},"pass_condition":"count > 0","message":"No critical services mapped"}', 'high'),
  ('RBI-7.1', 'Vendor Risk', 'Third-party and fintech risk assessment',
   '{"type":"cmdb_query","filter":{"ci_type":"saas_app"},"pass_condition":"count >= 0","message":"Vendor inventory incomplete"}', 'medium'),
  ('RBI-8.1', 'Data Protection', 'Customer data encryption and residency',
   '{"type":"cmdb_query","filter":{"ci_type":"database"},"pass_condition":"count > 0","message":"No databases inventoried"}', 'critical')
) AS v(control_id, title, description, validation_query, severity)
WHERE f.code = 'RBI-CSF'
  AND NOT EXISTS (
    SELECT 1 FROM compliance_controls c WHERE c.framework_id = f.id AND c.control_id = v.control_id
  );

-- PCI-DSS controls (representative)
INSERT INTO compliance_controls (framework_id, control_id, title, description, validation_query, severity)
SELECT f.id, v.control_id, v.title, v.description, v.validation_query::jsonb, v.severity
FROM compliance_frameworks f
CROSS JOIN (VALUES
  ('PCI-1.1', 'Firewall Configuration', 'Install and maintain network security controls',
   '{"type":"cmdb_query","filter":{"ci_type":"firewall"},"pass_condition":"count > 0","message":"No firewalls in CMDB"}', 'critical'),
  ('PCI-2.1', 'Secure Configurations', 'Apply secure configurations to all system components',
   '{"type":"cmdb_query","filter":{"health_score_lt":70},"pass_condition":"count == 0","message":"Systems with poor health/config scores"}', 'high'),
  ('PCI-3.1', 'Protect Stored Account Data', 'Protect stored cardholder data',
   '{"type":"cmdb_query","filter":{"ci_type":"database"},"pass_condition":"count > 0","message":"No data stores inventoried"}', 'critical'),
  ('PCI-4.1', 'Protect Data in Transit', 'Protect cardholder data with strong cryptography during transmission',
   '{"type":"cmdb_query","filter":{"ci_type":"load_balancer"},"pass_condition":"count >= 0","message":"TLS termination inventory incomplete"}', 'critical'),
  ('PCI-7.1', 'Restrict Access', 'Restrict access to system components by business need-to-know',
   '{"type":"cmdb_query","filter":{"owner_id":null},"pass_condition":"count == 0","message":"Unowned assets may indicate access gaps"}', 'high'),
  ('PCI-10.1', 'Log and Monitor', 'Log and monitor all access to network resources and cardholder data',
   '{"type":"cmdb_count","filter":{},"pass_condition":"count > 0","message":"No monitoring coverage"}', 'high'),
  ('PCI-11.1', 'Security Testing', 'Test security of systems and networks regularly',
   '{"type":"cmdb_query","filter":{"ci_type":"application"},"pass_condition":"count > 0","message":"No applications for security testing scope"}', 'medium'),
  ('PCI-12.1', 'Security Policy', 'Support information security with organizational policies',
   '{"type":"cmdb_count","filter":{},"pass_condition":"count > 0","message":"Policy scope assets missing"}', 'medium')
) AS v(control_id, title, description, validation_query, severity)
WHERE f.code = 'PCI-DSS'
  AND NOT EXISTS (
    SELECT 1 FROM compliance_controls c WHERE c.framework_id = f.id AND c.control_id = v.control_id
  );

-- Payment monitoring templates catalog
CREATE TABLE IF NOT EXISTS payment_flow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    classification VARCHAR(100) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]',
    slo_p99_ms INTEGER DEFAULT 2000,
    industry VARCHAR(50) DEFAULT 'banking',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO payment_flow_templates (code, name, classification, description, steps, slo_p99_ms) VALUES
  ('UPI-P2P', 'UPI P2P Payment', 'upi_payment',
   'Person-to-person UPI payment via NPCI switch',
   '[{"order":1,"name":"API Gateway","service":"api-gateway"},{"order":2,"name":"Auth validate","service":"auth-service"},{"order":3,"name":"UPI initiate","service":"payments"},{"order":4,"name":"NPCI switch","service":"npci-connector"},{"order":5,"name":"Ledger post","service":"ledger-db"},{"order":6,"name":"Notify customer","service":"notifications"}]'::jsonb,
   1200),
  ('UPI-P2M', 'UPI P2M Merchant Payment', 'upi_payment',
   'Person-to-merchant UPI collection',
   '[{"order":1,"name":"Merchant API","service":"merchant-api"},{"order":2,"name":"Risk check","service":"fraud-engine"},{"order":3,"name":"UPI collect","service":"payments"},{"order":4,"name":"Settlement","service":"settlement-service"}]'::jsonb,
   1500),
  ('NEFT-OUT', 'NEFT Outward Transfer', 'neft_transfer',
   'NEFT outward credit transfer',
   '[{"order":1,"name":"Channel intake","service":"api-gateway"},{"order":2,"name":"AML screen","service":"aml-service"},{"order":3,"name":"NEFT message","service":"payments"},{"order":4,"name":"RBI SFMS","service":"sfms-connector"}]'::jsonb,
   5000),
  ('IMPS-OUT', 'IMPS Instant Transfer', 'imps',
   'Immediate Payment Service transfer',
   '[{"order":1,"name":"API Gateway","service":"api-gateway"},{"order":2,"name":"IMPS initiate","service":"payments"},{"order":3,"name":"NPCI IMPS","service":"npci-connector"},{"order":4,"name":"Ledger post","service":"ledger-db"}]'::jsonb,
   2000),
  ('RTGS-OUT', 'RTGS High-Value Transfer', 'rtgs_transfer',
   'Real-time gross settlement for high-value payments',
   '[{"order":1,"name":"Branch/API intake","service":"api-gateway"},{"order":2,"name":"Dual authorization","service":"auth-service"},{"order":3,"name":"RTGS message","service":"payments"},{"order":4,"name":"RBI RTGS","service":"rtgs-connector"}]'::jsonb,
   3000)
ON CONFLICT (code) DO NOTHING;
