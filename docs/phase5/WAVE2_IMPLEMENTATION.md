# Phase 5 Wave 2 — Implementation

See [SDS-5.2-HighAvailabilityFoundation.md](./sds/SDS-5.2-HighAvailabilityFoundation.md).

- Migration: `034_high_availability.sql`
- Service: `apps/api-gateway/src/admin/ha.service.ts`
- APIs: `/admin/ha`, `/admin/cluster`, `/admin/replication`, `/admin/failover`, `/admin/backups/verify`, `/admin/upgrades/precheck`
- Compose: `docker-compose.ha.yml` + `infra/redis/sentinel.conf`
- Helm: HPA, PDB, probes, anti-affinity, ingress, PVC + `values-ha.yaml`
- UI: `/admin/ha`, nodes, replication, failover, upgrade-status, backup-verify
