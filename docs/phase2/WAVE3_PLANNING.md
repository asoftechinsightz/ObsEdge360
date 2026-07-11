# Wave 3 Planning Pack — Audit & Compliance Foundation

**Document ID:** OE360-WAVE3-PLAN-001  
**Status:** ✅ APPROVED — conditions incorporated; coding authorized  
**SDS:** [SDS-2.3](./sds/SDS-2.3-AuditFramework.md) — Accepted with Conditions  
**EAB:** 2026-07-11  

## Binding architecture

App → **Audit Queue (durable outbox)** → Evidence Writer → `audit_evidence`  
Layer 1 `audit_logs` remains sync best-effort on the request path.

## Mandatory vs deferred

See SDS-2.3 §3. No UEBA, anomaly AI, or compliance dashboards in Wave 3.

## WBS (execution)

| ID | Task |
|----|------|
| W3-01 | Migration 017 — evidence, outbox, retention, legal hold, indexes |
| W3-02 | Schema v1.1 types + hash/redaction in shared-security |
| W3-03 | Emit pipeline: L1 + enqueue |
| W3-04 | Evidence writer (poll outbox, idempotent L2 write) |
| W3-05 | APIs: ingest, search, export, verify, retention, legal hold |
| W3-06 | Metrics + health/queue depth |
| W3-07 | Tests + OpenAPI |
| W3-08 | Docs / baseline / WAVE3_COMPLETION |
| W3-09 | Deploy + validate (after local green) |

## Push checkpoint

Branch `feature/sprint0-enterprise-foundation` + tag `v0.9.2-wave2` — **approved to push** before/with Wave 3 code landing.
