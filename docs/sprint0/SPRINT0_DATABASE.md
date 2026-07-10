# Sprint 0 Database Schema

## Migration

**File:** `database/migrations/015_sprint0_enterprise_foundation.sql`  
**Prerequisite:** Migrations 001–014 (unchanged)

## New Tables

### Security (Module 8)

| Table | Purpose |
|-------|---------|
| `roles` | RBAC role definitions with JSON permissions |
| `user_roles` | User-to-role assignments |
| `api_keys` | Hashed API keys with scopes and expiry |
| `abac_policies` | Attribute-based access policies |
| `audit_logs` | Immutable audit trail |
| `rate_limit_buckets` | Optional persistent rate limit state |

### Agent Framework (Module 1)

| Table | Purpose |
|-------|---------|
| `agent_config_history` | Versioned agent configuration |
| `agent_offline_queue` | Server-side offline message tracking |

**Extended:** `discovery_agents` — platform, config_revision, config_payload, config_checksum, certificate_fingerprint, update_channel

### CMDB (Module 5)

| Table | Purpose |
|-------|---------|
| `ci_config_history` | CI attribute versioning |
| `ci_config_drift` | Configuration drift records |

### Topology (Module 6)

| Table | Purpose |
|-------|---------|
| `topology_snapshots` | Versioned topology graphs (application, infrastructure, cloud, network, business-service) |

### Scheduler (Module 9)

| Table | Purpose |
|-------|---------|
| `scheduler_jobs` | Distributed job definitions with cron |
| `scheduler_job_runs` | Execution history |
| `scheduler_dead_letter` | Failed job queue |

### Config Management (Module 10)

| Table | Purpose |
|-------|---------|
| `config_templates` | Versioned configuration templates |
| `config_deployments` | Deployment records with rollback support |

### Telemetry Pipeline (Module 4)

| Table | Purpose |
|-------|---------|
| `telemetry_sources` | Registered log/metric source adapters |

### Plugin SDK (Module 7)

| Table | Purpose |
|-------|---------|
| `plugin_registry` | Registered plugins with manifests |

## Indexes

All tenant-scoped tables include `tenant_id` indexes. Scheduler due jobs, audit logs, and drift detection have partial/composite indexes for query performance.

## Constraints

- Foreign keys to `tenants`, `users`, `configuration_items`, `discovery_agents`
- Check constraints on `abac_policies.effect`, `scheduler_jobs` status
- Unique constraints on tenant-scoped names and version tuples

## Partitioning Notes

`audit_logs` and `scheduler_job_runs` are candidates for time-based partitioning in production scale-out (future migration).
