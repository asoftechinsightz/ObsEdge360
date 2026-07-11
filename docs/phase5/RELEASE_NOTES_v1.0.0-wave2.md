# Release Notes — v1.0.0-wave2

**Phase 5 Wave 2 — High Availability Foundation**

## Highlights

- HA management metadata (migration 034)
- Cluster health probes for Postgres / Redis / Kafka / Gateway
- Failover event recording, backup verification, upgrade prechecks
- `docker-compose.ha.yml` + Redis Sentinel example
- Helm HA templates (HPA, PDB, rolling probes, ingress, PVC)

## Known limitations

- Production VPS remains single-node unless operator enables HA overlay (`HA_MULTI_NODE=true`)
- Postgres streaming replicas / Redis Sentinel / Kafka RF≥3 require operator infrastructure
- Not Enterprise GA

## Ops

- Tag: `v1.0.0-wave2`
- Validation: `P5_WAVE2_VALIDATION_OK`
- Migration: `034_high_availability.sql`
