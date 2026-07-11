# SDS-5.2 — High Availability Foundation

**Document ID:** OE360-SDS-5.2  
**Wave:** Phase 5 / Wave 2  
**Release track:** `v1.0.0-wave2`  
**Status:** ✅ APPROVED FOR IMPLEMENTATION  
**Depends on:** Wave 1 closed (`v1.0.0-wave1`)

## Objectives

1. Migration **034** HA management metadata (nodes, components, replication, failover events, backup verification, upgrade checks).
2. Secure Admin APIs: `/admin/ha`, `/admin/cluster`, `/admin/replication`, `/admin/failover`, upgrades + backup verify.
3. Honest cluster health: probes Postgres/Redis/Kafka where reachable; distinguish single-node baseline vs multi-node active.
4. Helm multi-replica templates (HPA, PDB, probes, anti-affinity, ingress, PVC stubs).
5. `docker-compose.ha.yml` overlay for gateway scale + Redis Sentinel + Kafka RF guidance.
6. Admin UI: HA Overview, Cluster Nodes, Replication, Failover Events, Upgrade Status, Backup Verification.
7. Validation token **`P5_WAVE2_VALIDATION_OK`**.

## Non-goals

- Claiming multi-AZ live HA on current single-node VPS without operator enablement
- `P5_GA_VALIDATION_OK` / tag `v1.0.0`
- Replacing business schemas

## Acceptance

Production script prints `P5_WAVE2_VALIDATION_OK`.
