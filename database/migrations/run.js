#!/usr/bin/env node
/**
 * Run SQL migrations and seeds against PostgreSQL.
 * Usage: node database/migrations/run.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const config = {
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? 'trinetra',
  password: process.env.POSTGRES_PASSWORD ?? 'trinetra_dev',
  database: process.env.POSTGRES_DB ?? 'trinetra360',
};

async function tableExists(client, tableName) {
  const res = await client.query(
    'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
    [tableName],
  );
  return res.rows[0]?.exists === true;
}

async function runSqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Running ${path.basename(filePath)}...`);
  await client.query(sql);
  console.log(`  ✓ ${path.basename(filePath)}`);
}

async function main() {
  const client = new Client(config);
  await client.connect();
  console.log('Connected to PostgreSQL');

  const migrationsDir = __dirname;

  if (!(await tableExists(client, 'tenants'))) {
    await runSqlFile(client, path.join(migrationsDir, '001_initial.sql'));
  } else {
    console.log('001_initial.sql already applied.');
  }

  if (!(await tableExists(client, 'business_transactions'))) {
    const phase2 = path.join(migrationsDir, '003_phase2.sql');
    if (fs.existsSync(phase2)) await runSqlFile(client, phase2);
  } else {
    console.log('003_phase2.sql already applied.');
  }

  if (!(await tableExists(client, 'fraud_alerts'))) {
    const phase3 = path.join(migrationsDir, '004_phase3.sql');
    if (fs.existsSync(phase3)) await runSqlFile(client, phase3);
  } else {
    console.log('004_phase3.sql already applied.');
  }

  if (!(await tableExists(client, 'industry_packs'))) {
    const phase4 = path.join(migrationsDir, '005_phase4.sql');
    if (fs.existsSync(phase4)) await runSqlFile(client, phase4);
  } else {
    console.log('005_phase4.sql already applied.');
  }

  const authCol = await client.query(
    "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash')",
  );
  if (authCol.rows[0]?.exists !== true) {
    const auth = path.join(migrationsDir, '006_auth.sql');
    if (fs.existsSync(auth)) await runSqlFile(client, auth);
  } else {
    console.log('006_auth.sql already applied.');
  }

  const agentsTable = await tableExists(client, 'discovery_agents');
  if (!agentsTable) {
    const s2 = path.join(migrationsDir, '007_discovery_agents.sql');
    if (fs.existsSync(s2)) await runSqlFile(client, s2);
  } else {
    console.log('007_discovery_agents.sql already applied.');
  }

  const scrapeTable = await tableExists(client, 'prometheus_scrape_targets');
  if (!scrapeTable) {
    const s5 = path.join(migrationsDir, '008_infra_monitoring.sql');
    if (fs.existsSync(s5)) await runSqlFile(client, s5);
  } else {
    console.log('008_infra_monitoring.sql already applied.');
  }

  const otlpTable = await tableExists(client, 'otlp_spans');
  if (!otlpTable) {
    const s6 = path.join(migrationsDir, '009_apm_otlp.sql');
    if (fs.existsSync(s6)) await runSqlFile(client, s6);
  } else {
    console.log('009_apm_otlp.sql already applied.');
  }

  const sloTable = await tableExists(client, 'transaction_slos');
  if (!sloTable) {
    const s7 = path.join(migrationsDir, '010_transaction_slos.sql');
    if (fs.existsSync(s7)) await runSqlFile(client, s7);
  } else {
    console.log('010_transaction_slos.sql already applied.');
  }

  const payTpl = await tableExists(client, 'payment_flow_templates');
  if (!payTpl) {
    const s8 = path.join(migrationsDir, '011_banking360_controls.sql');
    if (fs.existsSync(s8)) await runSqlFile(client, s8);
  } else {
    console.log('011_banking360_controls.sql already applied.');
  }

  const promSamples = await tableExists(client, 'prometheus_samples');
  if (!promSamples) {
    const s12 = path.join(migrationsDir, '012_prometheus_samples.sql');
    if (fs.existsSync(s12)) await runSqlFile(client, s12);
  } else {
    console.log('012_prometheus_samples.sql already applied.');
  }

  const ssoTable = await tableExists(client, 'sso_providers');
  if (!ssoTable) {
    const s13 = path.join(migrationsDir, '013_sso.sql');
    if (fs.existsSync(s13)) await runSqlFile(client, s13);
  } else {
    console.log('013_sso.sql already applied.');
  }

  const resetTable = await tableExists(client, 'password_reset_tokens');
  if (!resetTable) {
    const s14 = path.join(migrationsDir, '014_password_reset.sql');
    if (fs.existsSync(s14)) await runSqlFile(client, s14);
  } else {
    console.log('014_password_reset.sql already applied.');
  }

  const sprint0Table = await tableExists(client, 'roles');
  if (!sprint0Table) {
    const s15 = path.join(migrationsDir, '015_sprint0_enterprise_foundation.sql');
    if (fs.existsSync(s15)) await runSqlFile(client, s15);
  } else {
    console.log('015_sprint0_enterprise_foundation.sql already applied.');
  }

  const policyVersions = await tableExists(client, 'authz_policy_versions');
  if (!policyVersions) {
    const s16 = path.join(migrationsDir, '016_authz_policy_versions.sql');
    if (fs.existsSync(s16)) await runSqlFile(client, s16);
  } else {
    console.log('016_authz_policy_versions.sql already applied.');
  }

  const auditEvidence = await tableExists(client, 'audit_evidence');
  if (!auditEvidence) {
    const s17 = path.join(migrationsDir, '017_audit_dual_layer.sql');
    if (fs.existsSync(s17)) await runSqlFile(client, s17);
  } else {
    console.log('017_audit_dual_layer.sql already applied.');
  }

  const secretsTable = await tableExists(client, 'secrets');
  if (!secretsTable) {
    const s18 = path.join(migrationsDir, '018_secrets_store.sql');
    if (fs.existsSync(s18)) await runSqlFile(client, s18);
  } else {
    console.log('018_secrets_store.sql already applied.');
  }

  const serviceIdentities = await tableExists(client, 'service_identities');
  if (!serviceIdentities) {
    const s19 = path.join(migrationsDir, '019_service_identity_trust.sql');
    if (fs.existsSync(s19)) await runSqlFile(client, s19);
  } else {
    console.log('019_service_identity_trust.sql already applied.');
  }

  const securityEvents = await tableExists(client, 'security_events');
  if (!securityEvents) {
    const s20 = path.join(migrationsDir, '020_security_observability.sql');
    if (fs.existsSync(s20)) await runSqlFile(client, s20);
  } else {
    console.log('020_security_observability.sql already applied.');
  }

  const trustCa = await tableExists(client, 'trust_ca');
  if (!trustCa) {
    const s21 = path.join(migrationsDir, '021_service_identity_mesh.sql');
    if (fs.existsSync(s21)) await runSqlFile(client, s21);
  } else {
    console.log('021_service_identity_mesh.sql already applied.');
  }

  const telemetryCollectors = await tableExists(client, 'telemetry_collectors');
  if (!telemetryCollectors) {
    const s22 = path.join(migrationsDir, '022_telemetry_platform.sql');
    if (fs.existsSync(s22)) await runSqlFile(client, s22);
  } else {
    console.log('022_telemetry_platform.sql already applied.');
  }

  const uaAgentsTable = await tableExists(client, 'agents');
  if (!uaAgentsTable) {
    const s23 = path.join(migrationsDir, '023_universal_agent.sql');
    if (fs.existsSync(s23)) await runSqlFile(client, s23);
  } else {
    console.log('023_universal_agent.sql already applied.');
  }

  const discoveryJobs = await tableExists(client, 'discovery_jobs');
  if (!discoveryJobs) {
    const s24 = path.join(migrationsDir, '024_discovery_cmdb_depth.sql');
    if (fs.existsSync(s24)) await runSqlFile(client, s24);
  } else {
    console.log('024_discovery_cmdb_depth.sql already applied.');
  }

  const inferredDeps = await tableExists(client, 'inferred_dependencies');
  if (!inferredDeps) {
    const s25 = path.join(migrationsDir, '025_topology_live.sql');
    if (fs.existsSync(s25)) await runSqlFile(client, s25);
  } else {
    console.log('025_topology_live.sql already applied.');
  }

  const opsIncidents = await tableExists(client, 'ops_incidents');
  if (!opsIncidents) {
    const s26 = path.join(migrationsDir, '026_ops_intelligence.sql');
    if (fs.existsSync(s26)) await runSqlFile(client, s26);
  } else {
    console.log('026_ops_intelligence.sql already applied.');
  }

  const opsDashboards = await tableExists(client, 'ops_dashboards');
  if (!opsDashboards) {
    const s27 = path.join(migrationsDir, '027_ops_dashboards.sql');
    if (fs.existsSync(s27)) await runSqlFile(client, s27);
  } else {
    console.log('027_ops_dashboards.sql already applied.');
  }

  const llmUsage = await tableExists(client, 'llm_usage_events');
  if (!llmUsage) {
    const s28 = path.join(migrationsDir, '028_llm_aiops_foundation.sql');
    if (fs.existsSync(s28)) await runSqlFile(client, s28);
  } else {
    console.log('028_llm_aiops_foundation.sql already applied.');
  }

  const corrMembers = await tableExists(client, 'aiops_correlation_members');
  if (!corrMembers) {
    const s29 = path.join(migrationsDir, '029_aiops_multisignal_correlation.sql');
    if (fs.existsSync(s29)) await runSqlFile(client, s29);
  } else {
    console.log('029_aiops_multisignal_correlation.sql already applied.');
  }

  const seedsDir = path.join(__dirname, '..', 'seeds');
  if (fs.existsSync(seedsDir)) {
    const seeds = fs.readdirSync(seedsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of seeds) {
      const base = file.replace('.sql', '');
      if (base === '002_demo_enterprise') {
        const count = await client.query('SELECT COUNT(*) FROM configuration_items');
        if (Number(count.rows[0]?.count) > 0) {
          console.log(`Skipping ${file} (CIs exist).`);
          continue;
        }
      }
      if (base === '003_phase2_transactions') {
        const count = await client.query('SELECT COUNT(*) FROM business_transactions');
        if (Number(count.rows[0]?.count) > 0) {
          console.log(`Skipping ${file} (transactions exist).`);
          continue;
        }
      }
      if (base === '004_phase3_autonomy') {
        const count = await client.query('SELECT COUNT(*) FROM fraud_alerts');
        if (Number(count.rows[0]?.count) > 0) {
          console.log(`Skipping ${file} (phase3 seed exists).`);
          continue;
        }
      }
      if (base === '005_phase4_scale') {
        const count = await client.query('SELECT COUNT(*) FROM predictive_forecasts');
        if (Number(count.rows[0]?.count) > 0) {
          console.log(`Skipping ${file} (phase4 seed exists).`);
          continue;
        }
      }
      await runSqlFile(client, path.join(seedsDir, file));
    }
  }

  await client.end();
  console.log('Database ready.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
