# Sprint 2 — Unified Observability Experience

**Phase:** 3  
**Status:** RC2 **PASS** on production (`5571ff35`) — Sprint 3 authorized  
**Objective:** Enterprise-grade observability as a native OpsEdge360 experience. Engines are internal details.

## Principle

Do **not** ship a “SkyWalking integration” to customers.  
Ship the **OpsEdge360 Unified Observability Experience**.

No vendor branding, no redirects to external UIs, no duplicated chrome.

## Acceptance criteria

| ID | Criterion | Status |
|----|-----------|--------|
| S2-AC1 | ObserveAdapter SPI + native OTel + engine slot | **PASS** |
| S2-AC2 | Façade APIs under `/observe/*` (apps/infra/k8s/containers/dbs/logs/metrics/traces/topology) | **PASS** |
| S2-AC3 | OpsEdge-branded module screens with shared nav | **PASS** |
| S2-AC4 | Every entity links to Digital Twin | **PASS** |
| S2-AC5 | Inline AI on observe screens | **PASS** |
| S2-AC6 | Demo telemetry for Banking360 / Retail360 / K8s / Hybrid | **PASS** |
| S2-AC7 | No vendor names in customer DTOs / UI | **PASS** (unit tested) |
| S2-AC8 | RBAC: `/observe` maps to `observability:*` | **PASS** |
| S2-AC9 | Journey A Logs + Trace without vendor UI | **PASS** (local/demo) |
| S2-AC10 | Unit tests for fixtures + adapter branding | **PASS** |

## Modules delivered

| Module | Route | API |
|--------|-------|-----|
| Overview | `/observability` | `GET /observe/overview` |
| Applications | `/observability/applications` | `GET /observe/applications` |
| Infrastructure | `/observability/infrastructure` | `GET /observe/infrastructure` |
| Kubernetes | `/observability/kubernetes` | `GET /observe/kubernetes` |
| Containers | `/observability/containers` | `GET /observe/containers` |
| Databases | `/observability/databases` | `GET /observe/databases` |
| Logs | `/observability/logs` | `GET /observe/logs` |
| Metrics | `/observability/metrics` | `GET /observe/metrics` |
| Traces | `/observability/traces` | `GET /observe/traces` |
| Topology | `/observability/topology` | `GET /observe/topology` |

Legacy `/apm` remains under Debug/internal nav for compatibility.

## Architecture (locked)

```text
UI (OpsEdge chrome) → Gateway /observe → ObserveFacade → ObserveAdapter SPI
                                                      ├─ NativeOtelAdapter (live)
                                                      └─ Engine slot (demo / future GraphQL)
```

## Quality gate (pre-prod)

| Gate | Status |
|------|--------|
| Code / unit tests | PASS |
| UI review | PASS (design system + subnav) |
| API review | PASS |
| Security / RBAC | PASS (permission alias) |
| Multi-tenancy | PASS (tenant-scoped queries) |
| Performance | PENDING prod smoke |
| Accessibility | PARTIAL (basics; AA in 1.1) |
| Documentation | PASS |
| Demo | PASS (fixtures + EDE seed hook) |
| Regression | PASS (gateway tests) |
| Deployment | PENDING |

## Artifacts

- [SPRINT2_API_REFERENCE.md](./SPRINT2_API_REFERENCE.md)  
- [SPRINT2_UI_GUIDE.md](./SPRINT2_UI_GUIDE.md)  
- [SPRINT2_DEMO_GUIDE.md](./SPRINT2_DEMO_GUIDE.md)  
- [SPRINT2_RELEASE_NOTES.md](./SPRINT2_RELEASE_NOTES.md)  
- [SPRINT2_KNOWN_ISSUES.md](./SPRINT2_KNOWN_ISSUES.md)  
- [../../releases/RC2_VALIDATION_REPORT.md](../../releases/RC2_VALIDATION_REPORT.md)  
- Standards: [../PHASE3_EXECUTION_STANDARDS.md](../PHASE3_EXECUTION_STANDARDS.md)

## Rollback

1. Redeploy prior `api-gateway` + `web` images.  
2. Force-recreate nginx after container recreate.  
3. Optional: leave OTLP demo rows (harmless) or delete `attributes @> '{"demo":"sprint2"}'`.
