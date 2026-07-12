import { Injectable, Logger } from '@nestjs/common';
import { query, queryOne } from '@opsedge360/shared-db';
import { hashPassword } from '../auth/password.util';

export const EDE_ORG = 'Asoftech Global Bank (Demo)';
export const EDE_SLUG = 'asoftech-global-bank-demo';
export const EDE_TAG = 'ede-v1';
export const EDE_PACK = 'ede-v1.0';
/** Documented demo password for evaluator login (rotatable via reset). */
export const EDE_DEMO_PASSWORD = 'Demo@OpsEdge360!2026';
export const EDE_DEMO_EMAIL = 'cio@asoftech-global-bank.demo';

const SERVICE_NAMES = [
  'UPI Payments',
  'IMPS Transfers',
  'NEFT Clearing',
  'RTGS High Value',
  'ATM Switching',
  'Core Banking (CBS)',
  'Payment Gateway',
  'Fraud Detection',
  'Digital Banking',
  'Mobile Banking',
  'Merchant Acquiring',
  'Card Issuing',
  'Loan Origination',
  'Trade Finance',
  'Treasury Ops',
  'Customer Onboarding',
  'KYC / AML Screening',
  'Statement Services',
  'Notification Hub',
  'Internet Banking',
  'Corporate Portal',
  'Open Banking APIs',
  'Wealth Management',
  'Collections',
  'Reconciliation',
] as const;

@Injectable()
export class EdeSeedService {
  private readonly log = new Logger(EdeSeedService.name);

  async status(tenantId: string) {
    const summary = await queryOne<{
      organization_name: string;
      business_services: number;
      applications: number;
      servers: number;
      databases: number;
      kubernetes_clusters: number;
      cloud_resources: number;
      network_devices: number;
      apis: number;
      business_owners: number;
      loaded_at: string;
      pack_version: string;
      illustrative: boolean;
    }>(`SELECT * FROM ede_inventory_summary WHERE tenant_id=$1`, [tenantId]).catch(() => null);

    const ciCount = await queryOne<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM configuration_items WHERE tenant_id=$1 AND $2 = ANY(tags)`,
      [tenantId, EDE_TAG],
    ).catch(() => ({ c: '0' }));

    return {
      loaded: Boolean(summary) && Number(ciCount?.c ?? 0) > 0,
      packVersion: summary?.pack_version ?? EDE_PACK,
      illustrative: summary?.illustrative ?? true,
      label: 'Illustrative Demo Data',
      organizationName: summary?.organization_name ?? EDE_ORG,
      inventory: summary
        ? {
            businessServices: summary.business_services,
            applications: summary.applications,
            servers: summary.servers,
            databases: summary.databases,
            kubernetesClusters: summary.kubernetes_clusters,
            cloudResources: summary.cloud_resources,
            networkDevices: summary.network_devices,
            apis: summary.apis,
            businessOwners: summary.business_owners,
            environments: ['Prod', 'UAT', 'DR'],
          }
        : null,
      loadedAt: summary?.loaded_at ?? null,
      demoCiCount: Number(ciCount?.c ?? 0),
      guidedPath: '/demo/guided',
      resetPath: 'POST /demo/ede/reset',
    };
  }

  /** Ensure dedicated demo org exists and return its tenant id. */
  async ensureDemoTenant(): Promise<{ tenantId: string; email: string; created: boolean }> {
    let tenant = await queryOne<{ id: string }>(`SELECT id FROM tenants WHERE slug=$1`, [EDE_SLUG]);
    let created = false;
    if (!tenant) {
      tenant = await queryOne<{ id: string }>(
        `INSERT INTO tenants (name, slug) VALUES ($1,$2) RETURNING id`,
        [EDE_ORG, EDE_SLUG],
      );
      created = true;
    }
    if (!tenant?.id) throw new Error('Failed to provision EDE tenant');

    const hash = hashPassword(EDE_DEMO_PASSWORD);
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE tenant_id=$1 AND email=$2`,
      [tenant.id, EDE_DEMO_EMAIL],
    );
    if (!existing) {
      await query(
        `INSERT INTO users (tenant_id, email, name, role, password_hash)
         VALUES ($1,$2,$3,'admin',$4)`,
        [tenant.id, EDE_DEMO_EMAIL, 'Demo CIO — Asoftech Global Bank', hash],
      );
    } else {
      await query(`UPDATE users SET password_hash=$1, name=$2 WHERE id=$3`, [
        hash,
        'Demo CIO — Asoftech Global Bank',
        existing.id,
      ]);
    }

    await query(
      `INSERT INTO security_policies (tenant_id, policy_type, config)
       VALUES
         ($1, 'password', '{"minLength":8,"requireComplexity":false,"maxFailedAttempts":5,"lockoutMinutes":15,"historyCount":0}'::jsonb),
         ($1, 'session', '{"sessionTimeoutMinutes":1440,"idleTimeoutMinutes":60,"maxConcurrentSessions":10,"deviceTracking":true,"forcedLogoutEnabled":true}'::jsonb),
         ($1, 'mfa', '{"mode":"optional","graceDays":14}'::jsonb)
       ON CONFLICT (tenant_id, policy_type) DO NOTHING`,
      [tenant.id],
    ).catch(() => undefined);

    return { tenantId: tenant.id, email: EDE_DEMO_EMAIL, created };
  }

  /** Wipe prior EDE-tagged rows for tenant, then reload full pack. */
  async loadPack(tenantId: string, opts?: { organizationName?: string }): Promise<Record<string, unknown>> {
    const org = opts?.organizationName ?? EDE_ORG;
    this.log.log(`Loading EDE pack into tenant ${tenantId}`);
    await this.purge(tenantId);
    await this.seedOwners(tenantId);
    await this.seedBusinessServices(tenantId);
    await this.seedBulkCis(tenantId);
    await this.seedGraphCore(tenantId);
    await this.seedRelationships(tenantId);
    await this.seedDrift(tenantId);
    await this.seedDiscovery(tenantId);
    await this.seedIncidents(tenantId);
    await this.seedItsm(tenantId);
    await this.seedSecurity(tenantId);
    await this.seedExecutiveDaily(tenantId);
    await this.upsertInventory(tenantId, org);

    const status = await this.status(tenantId);
    return {
      ok: true,
      message: 'Enterprise Demo Experience pack loaded',
      ...status,
      label: 'Illustrative Demo Data',
    };
  }

  async resetAndLoad(tenantId: string) {
    await query(`DELETE FROM demo_tour_progress WHERE tenant_id=$1`, [tenantId]).catch(() => undefined);
    const pack = await this.loadPack(tenantId);
    const run = await queryOne(
      `INSERT INTO demo_reset_runs (tenant_id, requested_by, status, summary)
       VALUES ($1,NULL,'completed',$2::jsonb) RETURNING id, created_at`,
      [tenantId, JSON.stringify({ ede: true, packVersion: EDE_PACK, ...pack })],
    ).catch(() => null);
    return { reset: run, pack };
  }

  private async purge(tenantId: string) {
    // Order: dependents first
    await query(
      `DELETE FROM drift_events WHERE tenant_id=$1 AND ci_id IN (
         SELECT id FROM configuration_items WHERE tenant_id=$1 AND $2 = ANY(tags)
       )`,
      [tenantId, EDE_TAG],
    ).catch(() => undefined);
    await query(`DELETE FROM relationships WHERE tenant_id=$1 AND (
      source_ci_id IN (SELECT id FROM configuration_items WHERE tenant_id=$1 AND $2 = ANY(tags))
      OR target_ci_id IN (SELECT id FROM configuration_items WHERE tenant_id=$1 AND $2 = ANY(tags))
    )`, [tenantId, EDE_TAG]).catch(() => undefined);
    await query(`DELETE FROM ops_incidents WHERE tenant_id=$1 AND correlation_key LIKE 'ede-%'`, [tenantId]).catch(
      () => undefined,
    );
    await query(`DELETE FROM itsm_problems WHERE tenant_id=$1 AND title LIKE 'EDE:%'`, [tenantId]).catch(() => undefined);
    await query(`DELETE FROM itsm_changes WHERE tenant_id=$1 AND title LIKE 'EDE:%'`, [tenantId]).catch(() => undefined);
    await query(`DELETE FROM itsm_knowledge_articles WHERE tenant_id=$1 AND title LIKE 'EDE:%'`, [tenantId]).catch(
      () => undefined,
    );
    await query(`DELETE FROM itsm_service_catalog_items WHERE tenant_id=$1 AND name LIKE 'EDE:%'`, [tenantId]).catch(
      () => undefined,
    );
    await query(`DELETE FROM itsm_cab_approvals WHERE tenant_id=$1`, [tenantId]).catch(() => undefined);
    await query(`DELETE FROM itsm_assets WHERE tenant_id=$1 AND name LIKE 'EDE:%'`, [tenantId]).catch(() => undefined);
    await query(`DELETE FROM security_alerts WHERE tenant_id=$1 AND title LIKE 'EDE:%'`, [tenantId]).catch(
      () => undefined,
    );
    await query(`DELETE FROM discovery_connectors WHERE tenant_id=$1 AND name LIKE 'EDE %'`, [tenantId]).catch(
      () => undefined,
    );
    await query(`DELETE FROM ede_executive_daily WHERE tenant_id=$1`, [tenantId]).catch(() => undefined);
    await query(`DELETE FROM business_services WHERE tenant_id=$1 AND name = ANY($2::text[])`, [
      tenantId,
      [...SERVICE_NAMES],
    ]).catch(() => undefined);
    await query(`DELETE FROM configuration_items WHERE tenant_id=$1 AND $2 = ANY(tags)`, [tenantId, EDE_TAG]);
    await query(`DELETE FROM users WHERE tenant_id=$1 AND email LIKE 'owner%@asoftech-global-bank.demo'`, [
      tenantId,
    ]).catch(() => undefined);
  }

  private async seedOwners(tenantId: string) {
    const hash = hashPassword(EDE_DEMO_PASSWORD);
    await query(
      `INSERT INTO users (tenant_id, email, name, role, password_hash)
       SELECT $1, 'owner' || g || '@asoftech-global-bank.demo', 'Business Owner ' || g, 'viewer', $2
       FROM generate_series(1, 30) g
       WHERE NOT EXISTS (
         SELECT 1 FROM users u WHERE u.tenant_id=$1 AND u.email = 'owner' || g || '@asoftech-global-bank.demo'
       )`,
      [tenantId, hash],
    );
  }

  private async seedBusinessServices(tenantId: string) {
    for (let i = 0; i < SERVICE_NAMES.length; i++) {
      const name = SERVICE_NAMES[i];
      const tier = i < 8 ? 1 : i < 16 ? 2 : 3;
      const revenue = tier === 1 ? 180000 - i * 4000 : tier === 2 ? 45000 : 12000;
      const sla = tier === 1 ? 99.95 : 99.5;
      await query(
        `INSERT INTO business_services (tenant_id, name, description, tier, sla_target, revenue_per_hour)
         SELECT $1::uuid, $2::text, $3::text, $4::int, $5::numeric, $6::numeric
         WHERE NOT EXISTS (
           SELECT 1 FROM business_services b WHERE b.tenant_id=$1::uuid AND b.name=$2::text
         )`,
        [tenantId, name, `Illustrative Demo Data — ${name} journey for Asoftech Global Bank`, tier, sla, revenue],
      );
    }
  }

  private async seedBulkCis(tenantId: string) {
    const specs: Array<{ prefix: string; type: string; count: number; namePrefix: string }> = [
      { prefix: 'ede-app', type: 'application', count: 350, namePrefix: 'AGB-APP' },
      { prefix: 'ede-srv', type: 'server', count: 1500, namePrefix: 'AGB-SRV' },
      { prefix: 'ede-db', type: 'database', count: 280, namePrefix: 'AGB-DB' },
      { prefix: 'ede-k8s', type: 'cloud_resource', count: 150, namePrefix: 'AGB-K8S' },
      { prefix: 'ede-cloud', type: 'cloud_resource', count: 900, namePrefix: 'AGB-CLD' },
      { prefix: 'ede-net', type: 'network_device', count: 120, namePrefix: 'AGB-NET' },
      { prefix: 'ede-api', type: 'api', count: 40, namePrefix: 'AGB-API' },
      { prefix: 'ede-fw', type: 'firewall', count: 24, namePrefix: 'AGB-FW' },
      { prefix: 'ede-lb', type: 'load_balancer', count: 36, namePrefix: 'AGB-LB' },
      { prefix: 'ede-q', type: 'queue', count: 48, namePrefix: 'AGB-MQ' },
      { prefix: 'ede-cache', type: 'cache', count: 40, namePrefix: 'AGB-CACHE' },
    ];

    for (const s of specs) {
      await query(
        `INSERT INTO configuration_items (
           tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score,
           ai_confidence_score, attributes, tags, discovered_at, last_seen_at
         )
         SELECT $1,
                $2 || '-' || g,
                $3 || '-' || lpad(g::text, 4, '0'),
                $4::ci_type,
                'active',
                80 + (g % 20),
                85 + (g % 15),
                (g % 40),
                88,
                jsonb_build_object(
                  'ede', true,
                  'illustrative', true,
                  'environment', CASE WHEN g % 3 = 0 THEN 'DR' WHEN g % 3 = 1 THEN 'UAT' ELSE 'Prod' END,
                  'region', CASE WHEN g % 4 = 0 THEN 'ap-south-1' WHEN g % 4 = 1 THEN 'ap-south-2' WHEN g % 4 = 2 THEN 'eu-west-1' ELSE 'us-east-1' END,
                  'kind', $5,
                  'ownerIndex', 1 + (g % 30),
                  'label', 'Illustrative Demo Data'
                ),
                ARRAY[$6, 'illustrative-demo', 'demo'],
                NOW() - ((g % 45) || ' days')::interval,
                NOW() - ((g % 12) || ' hours')::interval
         FROM generate_series(1, $7) g
         WHERE NOT EXISTS (
           SELECT 1 FROM configuration_items c WHERE c.tenant_id=$1 AND c.external_id = $2 || '-' || g
         )`,
        [tenantId, s.prefix, s.namePrefix, s.type, s.type, EDE_TAG, s.count],
      );
    }
  }

  /** Named graph anchors for Twin / Topology storytelling. */
  private async seedGraphCore(tenantId: string) {
    const anchors: Array<{ ext: string; name: string; type: string; attrs: Record<string, unknown> }> = [
      { ext: 'ede-core-upi', name: 'UPI Payments Fabric', type: 'application', attrs: { journey: 'UPI', criticality: 'tier1' } },
      { ext: 'ede-core-cbs', name: 'Core Banking Suite', type: 'application', attrs: { journey: 'CBS', criticality: 'tier1' } },
      { ext: 'ede-core-pg', name: 'Payment Gateway Hub', type: 'application', attrs: { journey: 'PG', criticality: 'tier1' } },
      { ext: 'ede-core-fraud', name: 'Fraud Detection Engine', type: 'application', attrs: { journey: 'Fraud', criticality: 'tier1' } },
      { ext: 'ede-core-api-gw', name: 'Enterprise API Gateway', type: 'api', attrs: { role: 'edge' } },
      { ext: 'ede-core-oracle', name: 'CBS Oracle RAC', type: 'database', attrs: { engine: 'Oracle' } },
      { ext: 'ede-core-pgdb', name: 'Payments PostgreSQL', type: 'database', attrs: { engine: 'PostgreSQL' } },
      { ext: 'ede-core-redis', name: 'Session Redis Cluster', type: 'cache', attrs: { engine: 'Redis' } },
      { ext: 'ede-core-kafka', name: 'Payments Kafka Bus', type: 'queue', attrs: { engine: 'Kafka' } },
      { ext: 'ede-core-k8s-mum', name: 'EKS Mumbai Payments', type: 'cloud_resource', attrs: { kind: 'kubernetes', region: 'ap-south-1' } },
      { ext: 'ede-core-k8s-hyd', name: 'AKS Hyderabad DR', type: 'cloud_resource', attrs: { kind: 'kubernetes', region: 'ap-south-2' } },
      { ext: 'ede-core-lb-pub', name: 'Public ALB Payments', type: 'load_balancer', attrs: { plane: 'edge' } },
      { ext: 'ede-core-fw-dmz', name: 'DMZ Edge Firewall', type: 'firewall', attrs: { plane: 'dmz' } },
      { ext: 'ede-core-storage', name: 'Enterprise SAN Volume Group', type: 'cloud_resource', attrs: { kind: 'storage' } },
    ];

    for (const a of anchors) {
      await query(
        `INSERT INTO configuration_items (
           tenant_id, external_id, name, ci_type, status, health_score, compliance_score, risk_score,
           ai_confidence_score, attributes, tags, discovered_at, last_seen_at
         )
         SELECT $1, $2, $3, $4::ci_type, 'active', 94, 96, 18, 92,
                $5::jsonb || '{"ede":true,"illustrative":true,"label":"Illustrative Demo Data"}'::jsonb,
                ARRAY[$6,'illustrative-demo','demo','graph-core'],
                NOW() - interval '60 days', NOW()
         WHERE NOT EXISTS (SELECT 1 FROM configuration_items c WHERE c.tenant_id=$1 AND c.external_id=$2)`,
        [tenantId, a.ext, a.name, a.type, JSON.stringify(a.attrs), EDE_TAG],
      );
    }
  }

  private async seedRelationships(tenantId: string) {
    const pairs: Array<[string, string, string]> = [
      ['ede-core-upi', 'ede-core-api-gw', 'depends_on'],
      ['ede-core-upi', 'ede-core-pgdb', 'depends_on'],
      ['ede-core-upi', 'ede-core-kafka', 'depends_on'],
      ['ede-core-upi', 'ede-core-redis', 'depends_on'],
      ['ede-core-upi', 'ede-core-fraud', 'calls'],
      ['ede-core-pg', 'ede-core-api-gw', 'depends_on'],
      ['ede-core-pg', 'ede-core-kafka', 'depends_on'],
      ['ede-core-cbs', 'ede-core-oracle', 'depends_on'],
      ['ede-core-cbs', 'ede-core-api-gw', 'calls'],
      ['ede-core-fraud', 'ede-core-kafka', 'depends_on'],
      ['ede-core-api-gw', 'ede-core-lb-pub', 'runs_on'],
      ['ede-core-lb-pub', 'ede-core-fw-dmz', 'connects_to'],
      ['ede-core-upi', 'ede-core-k8s-mum', 'runs_on'],
      ['ede-core-pg', 'ede-core-k8s-mum', 'runs_on'],
      ['ede-core-fraud', 'ede-core-k8s-mum', 'runs_on'],
      ['ede-core-cbs', 'ede-core-k8s-hyd', 'runs_on'],
      ['ede-core-oracle', 'ede-core-storage', 'depends_on'],
      ['ede-core-pgdb', 'ede-core-storage', 'depends_on'],
      ['ede-core-fw-dmz', 'ede-core-lb-pub', 'secures'],
    ];

    for (const [src, tgt, rel] of pairs) {
      await query(
        `INSERT INTO relationships (tenant_id, source_ci_id, target_ci_id, relationship_type, strength, discovered_by, ai_confidence_score, metadata)
         SELECT $1, s.id, t.id, $4::relationship_type, 'critical', 'ede-seed', 95,
                '{"illustrative":true,"label":"Illustrative Demo Data"}'::jsonb
         FROM configuration_items s
         JOIN configuration_items t ON t.tenant_id=s.tenant_id AND t.external_id=$3
         WHERE s.tenant_id=$1 AND s.external_id=$2
           AND NOT EXISTS (
             SELECT 1 FROM relationships r
             WHERE r.tenant_id=$1 AND r.source_ci_id=s.id AND r.target_ci_id=t.id AND r.relationship_type=$4::relationship_type
           )`,
        [tenantId, src, tgt, rel],
      );
    }

    // Fan-out: first 40 apps depend on API gateway
    await query(
      `INSERT INTO relationships (tenant_id, source_ci_id, target_ci_id, relationship_type, strength, discovered_by, metadata)
       SELECT $1, a.id, g.id, 'depends_on', 'normal', 'ede-seed',
              '{"illustrative":true}'::jsonb
       FROM configuration_items a
       CROSS JOIN configuration_items g
       WHERE a.tenant_id=$1 AND a.external_id LIKE 'ede-app-%'
         AND g.tenant_id=$1 AND g.external_id='ede-core-api-gw'
         AND substring(a.external_id from 'ede-app-([0-9]+)')::int <= 40
         AND NOT EXISTS (
           SELECT 1 FROM relationships r WHERE r.tenant_id=$1 AND r.source_ci_id=a.id AND r.target_ci_id=g.id
         )`,
      [tenantId],
    );
  }

  private async seedDrift(tenantId: string) {
    const drifts = [
      {
        ci: 'ede-core-fw-dmz',
        type: 'firewall_rule_changed',
        severity: 'high',
        summary: 'Firewall rule changed — inbound 443 ACL widened in DMZ',
        details: {
          businessImpact: 'Expanded attack surface on payment edge',
          recommendedAction: 'Revert ACL to approved baseline and require CAB for edge changes',
          approvalStatus: 'pending',
        },
      },
      {
        ci: 'ede-core-api-gw',
        type: 'ssl_certificate_updated',
        severity: 'medium',
        summary: 'SSL certificate updated on Enterprise API Gateway',
        details: {
          businessImpact: 'Certificate chain change may affect partner mTLS',
          recommendedAction: 'Validate partner trust stores; schedule synthetic SSL checks',
          approvalStatus: 'approved',
        },
      },
      {
        ci: 'ede-core-k8s-mum',
        type: 'kubernetes_deployment_drift',
        severity: 'high',
        summary: 'Kubernetes deployment drift — payments-api replicas below desired',
        details: {
          businessImpact: 'UPI latency risk during peak windows',
          recommendedAction: 'Restore replica count to 12 and enable HPA alert',
          approvalStatus: 'pending',
        },
      },
      {
        ci: 'ede-core-oracle',
        type: 'database_configuration_drift',
        severity: 'critical',
        summary: 'Database configuration drift — max_connections reduced on CBS Oracle RAC',
        details: {
          businessImpact: 'Core banking connection pool exhaustion risk',
          recommendedAction: 'Restore parameter baseline; open Sev-2 change',
          approvalStatus: 'in_review',
        },
      },
      {
        ci: 'ede-srv-12',
        type: 'windows_patch_missing',
        severity: 'medium',
        summary: 'Windows patch missing — July cumulative update absent on AGB-SRV-0012',
        details: {
          businessImpact: 'Compliance posture reduced for PCI scope hosts',
          recommendedAction: 'Schedule patch window in UAT then Prod CAB',
          approvalStatus: 'scheduled',
        },
      },
      {
        ci: 'ede-core-api-gw',
        type: 'iam_policy_modified',
        severity: 'high',
        summary: 'IAM policy modified — wildcard s3:GetObject granted to payments role',
        details: {
          businessImpact: 'Over-privileged access to statement archives',
          recommendedAction: 'Replace with least-privilege prefix policy',
          approvalStatus: 'pending',
        },
      },
    ];

    for (const d of drifts) {
      await query(
        `INSERT INTO drift_events (tenant_id, ci_id, drift_type, severity, summary, details, detected_at)
         SELECT $1, c.id, $2, $3, $4, $5::jsonb, NOW() - ($6 || ' hours')::interval
         FROM configuration_items c
         WHERE c.tenant_id=$1 AND c.external_id=$7
           AND NOT EXISTS (
             SELECT 1 FROM drift_events e WHERE e.tenant_id=$1 AND e.ci_id=c.id AND e.drift_type=$2 AND e.resolved_at IS NULL
           )`,
        [
          tenantId,
          d.type,
          d.severity,
          d.summary,
          JSON.stringify({ ...d.details, illustrative: true, label: 'Illustrative Demo Data' }),
          String(6 + Math.floor(Math.random() * 48)),
          d.ci,
        ],
      );
    }
  }

  private async seedDiscovery(tenantId: string) {
    const connectors = [
      ['EDE AWS Account Scan', 'aws', { coverage: 96, successRate: 98.2, region: 'ap-south-1' }],
      ['EDE Azure Subscription', 'azure', { coverage: 91, successRate: 97.1, region: 'centralindia' }],
      ['EDE GCP Project', 'gcp', { coverage: 88, successRate: 95.4, region: 'asia-south1' }],
      ['EDE VMware vCenter', 'vmware', { coverage: 93, successRate: 99.0, dc: 'Mumbai-DC1' }],
      ['EDE Kubernetes EKS', 'kubernetes', { coverage: 97, successRate: 98.8, clusters: 42 }],
      ['EDE SNMP Campus', 'snmp', { coverage: 84, successRate: 92.5, devices: 120 }],
      ['EDE Linux SSH Estate', 'linux', { coverage: 95, successRate: 99.2, hosts: 820 }],
      ['EDE Windows WinRM', 'windows', { coverage: 90, successRate: 96.8, hosts: 680 }],
      ['EDE Database Discovery', 'database', { coverage: 89, successRate: 97.6, engines: ['Oracle', 'PostgreSQL', 'SQLServer'] }],
    ] as const;

    for (const [name, protocol, cfg] of connectors) {
      await query(
        `INSERT INTO discovery_connectors (tenant_id, name, protocol, config, enabled, last_run_at)
         SELECT $1, $2, $3, $4::jsonb, true, NOW() - interval '2 hours'
         WHERE NOT EXISTS (SELECT 1 FROM discovery_connectors d WHERE d.tenant_id=$1 AND d.name=$2)`,
        [
          tenantId,
          name,
          protocol,
          JSON.stringify({
            ...cfg,
            illustrative: true,
            label: 'Illustrative Demo Data',
            lastStatus: 'completed',
            failedScans: protocol === 'snmp' ? 3 : 1,
            pendingDiscoveries: protocol === 'gcp' ? 12 : 4,
          }),
        ],
      );
    }
  }

  private async seedIncidents(tenantId: string) {
    const incidents = [
      ['UPI latency elevated in Mumbai region', 'critical', 'investigating'],
      ['API Gateway certificate nearing expiry', 'warning', 'acknowledged'],
      ['CBS connection pool saturation warning', 'critical', 'open'],
      ['Azure DR replication lag', 'warning', 'open'],
      ['Fraud engine model drift alert', 'warning', 'investigating'],
      ['ATM switch intermittent timeouts', 'critical', 'open'],
      ['NEFT batch window delay', 'info', 'acknowledged'],
      ['Kubernetes node pressure payments-pool', 'warning', 'open'],
      ['IMPS success-rate dip below SLA', 'critical', 'investigating'],
      ['Synthetic journey failure — Internet Banking login', 'warning', 'open'],
      ['PCI scan finding on statement host', 'info', 'acknowledged'],
      ['Redis eviction spike on session cluster', 'warning', 'open'],
    ] as const;

    for (let i = 0; i < incidents.length; i++) {
      const [title, severity, status] = incidents[i];
      await query(
        `INSERT INTO ops_incidents (
           tenant_id, title, severity, status, window_start, window_end, correlation_key, signal_counts, blast_summary
         )
         SELECT $1, $2, $3, $4, NOW() - interval '6 hours', NOW() + interval '2 hours', $5,
                '{"alerts":12,"traces":4,"logs":28}'::jsonb,
                '{"illustrative":true,"services":["UPI Payments","Payment Gateway"],"label":"Illustrative Demo Data"}'::jsonb
         WHERE NOT EXISTS (SELECT 1 FROM ops_incidents o WHERE o.tenant_id=$1 AND o.correlation_key=$5)`,
        [tenantId, title, severity, status, `ede-inc-${i + 1}`],
      );
    }
  }

  private async seedItsm(tenantId: string) {
    await query(
      `INSERT INTO itsm_problems (tenant_id, number, title, status, priority, root_cause, metadata)
       SELECT $1, v.number, v.title, v.status, v.priority, v.root_cause, '{"illustrative":true,"label":"Illustrative Demo Data"}'::jsonb
       FROM (VALUES
         ('PRB-EDE-1001', 'EDE: Recurring UPI p99 latency', 'root_cause_analysis', 'high', 'Correlated with Kafka consumer lag'),
         ('PRB-EDE-1002', 'EDE: Certificate lifecycle gaps', 'known_error', 'medium', '3 edge certs expire within 14 days')
       ) AS v(number, title, status, priority, root_cause)
       WHERE NOT EXISTS (SELECT 1 FROM itsm_problems p WHERE p.tenant_id=$1 AND p.number=v.number)`,
      [tenantId],
    ).catch(() => undefined);

    await query(
      `INSERT INTO itsm_changes (tenant_id, number, title, status, risk, scheduled_start, scheduled_end, metadata)
       SELECT $1, v.number, v.title, v.status, v.risk, NOW() + interval '1 day', NOW() + interval '1 day 2 hours',
              jsonb_build_object('illustrative', true, 'summary', v.summary)
       FROM (VALUES
         ('CHG-EDE-2001', 'EDE: Scale payments-api HPA', 'cab_pending', 'medium', 'Raise max replicas to 18'),
         ('CHG-EDE-2002', 'EDE: Rotate API Gateway certificate', 'approved', 'low', 'Board-approved maintenance'),
         ('CHG-EDE-2003', 'EDE: Oracle max_connections restore', 'implementing', 'high', 'Reverse config drift')
       ) AS v(number, title, status, risk, summary)
       WHERE NOT EXISTS (SELECT 1 FROM itsm_changes c WHERE c.tenant_id=$1 AND c.number=v.number)`,
      [tenantId],
    ).catch(() => undefined);

    await query(
      `INSERT INTO itsm_knowledge_articles (tenant_id, title, body, tags, published)
       SELECT $1, v.title, v.body, ARRAY[v.tag, 'ede', 'illustrative-demo'], true
       FROM (VALUES
         ('EDE: UPI latency runbook', 'Illustrative Demo Data — check Kafka lag, HPA, DB pool, then fraud timeout.', 'payments'),
         ('EDE: Certificate expiry playbook', 'Illustrative Demo Data — inventory edge certs, renew, update synthetics.', 'security'),
         ('EDE: CAB checklist for edge firewall', 'Illustrative Demo Data — peer review ACL diffs before Prod.', 'change')
       ) AS v(title, body, tag)
       WHERE NOT EXISTS (SELECT 1 FROM itsm_knowledge_articles k WHERE k.tenant_id=$1 AND k.title=v.title)`,
      [tenantId],
    ).catch(() => undefined);

    await query(
      `INSERT INTO itsm_service_catalog_items (tenant_id, name, category, description)
       SELECT $1, v.name, v.category, v.description
       FROM (VALUES
         ('EDE: Access request — Observability', 'access', 'Illustrative Demo Data — viewer role for OpsEdge360'),
         ('EDE: New discovery connector', 'platform', 'Illustrative Demo Data — onboard AWS/Azure account')
       ) AS v(name, category, description)
       WHERE NOT EXISTS (SELECT 1 FROM itsm_service_catalog_items s WHERE s.tenant_id=$1 AND s.name=v.name)`,
      [tenantId],
    ).catch(() => undefined);

    await query(
      `INSERT INTO itsm_assets (tenant_id, asset_tag, lifecycle_state, owner, metadata)
       SELECT $1, v.tag, 'in_service', v.owner, '{"illustrative":true,"label":"Illustrative Demo Data","name":"' || v.name || '"}'::jsonb
       FROM (VALUES
         ('EDE-LPT-001', 'Demo CIO laptop', 'Demo CIO'),
         ('EDE-JMP-MUM', 'Jump host Mumbai', 'NOC')
       ) AS v(tag, name, owner)
       WHERE NOT EXISTS (SELECT 1 FROM itsm_assets a WHERE a.tenant_id=$1 AND a.asset_tag=v.tag)`,
      [tenantId],
    ).catch(() => undefined);

    await query(
      `INSERT INTO itsm_cab_approvals (tenant_id, change_id, approver_role, status, comment)
       SELECT $1, c.id, 'CAB Chair', 'pending', 'Illustrative Demo Data — awaiting business owner sign-off'
       FROM itsm_changes c
       WHERE c.tenant_id=$1 AND c.title LIKE 'EDE:%'
         AND NOT EXISTS (SELECT 1 FROM itsm_cab_approvals a WHERE a.tenant_id=$1 AND a.change_id=c.id)
       LIMIT 3`,
      [tenantId],
    ).catch(() => undefined);
  }

  private async seedSecurity(tenantId: string) {
    const alerts = [
      ['EDE: TLS certificate expires in 9 days — API Gateway', 'high'],
      ['EDE: Dormant API token — payments automation', 'medium'],
      ['EDE: Privileged session without MFA step-up', 'high'],
      ['EDE: Vulnerability — OpenSSL advisory on bastion', 'medium'],
      ['EDE: Impossible travel login — SOC review', 'low'],
    ] as const;

    for (const [title, severity] of alerts) {
      await query(
        `INSERT INTO security_alerts (tenant_id, title, severity, status, summary, created_at)
         SELECT $1, $2, $3, 'open', 'Illustrative Demo Data — security posture sample', NOW() - interval '1 day'
         WHERE NOT EXISTS (SELECT 1 FROM security_alerts s WHERE s.tenant_id=$1 AND s.title=$2)`,
        [tenantId, title, severity],
      ).catch(() => undefined);
    }
  }

  private async seedExecutiveDaily(tenantId: string) {
    await query(
      `INSERT INTO ede_executive_daily (
         tenant_id, day, availability, revenue_at_risk, compliance_score, sustainability_score,
         active_incidents, open_alerts, mttr_minutes, sla_compliance
       )
       SELECT $1,
              (CURRENT_DATE - (g || ' days')::interval)::date,
              99.90 + ((g % 7) * 0.01),
              120000 + (g % 10) * 8000,
              90 + (g % 8),
              78 + (g % 10),
              8 + (g % 7),
              120 + (g % 40),
              35 + (g % 25),
              96 + (g % 4)
       FROM generate_series(0, 29) g
       ON CONFLICT (tenant_id, day) DO UPDATE SET
         availability = EXCLUDED.availability,
         revenue_at_risk = EXCLUDED.revenue_at_risk,
         compliance_score = EXCLUDED.compliance_score,
         sustainability_score = EXCLUDED.sustainability_score,
         active_incidents = EXCLUDED.active_incidents,
         open_alerts = EXCLUDED.open_alerts,
         mttr_minutes = EXCLUDED.mttr_minutes,
         sla_compliance = EXCLUDED.sla_compliance`,
      [tenantId],
    );
  }

  private async upsertInventory(tenantId: string, org: string) {
    await query(
      `INSERT INTO ede_inventory_summary (
         tenant_id, organization_name, business_services, applications, servers, databases,
         kubernetes_clusters, cloud_resources, network_devices, apis, business_owners,
         environments, illustrative, loaded_at, pack_version, meta
       ) VALUES (
         $1, $2, 25, 350, 1500, 280, 150, 900, 120, 40, 30,
         ARRAY['Prod','UAT','DR'], true, NOW(), $3,
         '{"label":"Illustrative Demo Data","pack":"Enterprise Demo Experience"}'::jsonb
       )
       ON CONFLICT (tenant_id) DO UPDATE SET
         organization_name = EXCLUDED.organization_name,
         business_services = EXCLUDED.business_services,
         applications = EXCLUDED.applications,
         servers = EXCLUDED.servers,
         databases = EXCLUDED.databases,
         kubernetes_clusters = EXCLUDED.kubernetes_clusters,
         cloud_resources = EXCLUDED.cloud_resources,
         network_devices = EXCLUDED.network_devices,
         apis = EXCLUDED.apis,
         business_owners = EXCLUDED.business_owners,
         loaded_at = NOW(),
         pack_version = EXCLUDED.pack_version,
         meta = EXCLUDED.meta`,
      [tenantId, org, EDE_PACK],
    );
  }
}
