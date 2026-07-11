# Wave 3 Completion — Audit & Compliance Foundation

**Wave:** 3  
**Release:** `v0.9.2`  
**SDS:** [SDS-2.3-AuditFramework.md](./sds/SDS-2.3-AuditFramework.md)  
**Status:** ✅ COMPLETE — **DEPLOYED & VALIDATED**  
**Evidence:** [WAVE3_DEPLOYED.md](./WAVE3_DEPLOYED.md)  

## Delivered (mandatory scope)

| Item | Location |
|------|----------|
| Schema v1.1 | `packages/shared-security` audit-event |
| L1 operational store | `audit_logs` |
| Durable audit queue | `audit_evidence_outbox` |
| L2 evidence store | `audit_evidence` + content_hash |
| Evidence writer | `AuditEvidenceWriterService` |
| APIs | ingest, search, export, verify, retention, legal hold, health |
| Retention policies | `audit_retention_policies` |
| Legal hold foundation | `audit_legal_holds` |
| Migration | **017** |
| Metrics | `security.audit.*` |
| OpenAPI | `/audit/*` |
| Validation | `scripts/vps-wave3-validate.sh` |

## Deferred (per EAB)

UEBA · anomaly AI · risk scoring · compliance dashboards · executive reporting · WORM/Object Lock · digital signatures · Merkle verification job

## Rollback

`AUDIT_L2_QUEUE=false` · `AUDIT_EMIT=false` · redeploy `v0.9.2-wave2`
