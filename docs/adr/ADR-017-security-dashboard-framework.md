# ADR-017: Security Dashboard Architecture

**Decision Status:** Accepted  
**Date:** 2026-07-10 · **Accepted:** 2026-07-11  
**Deciders:** EAB  
**Phase / Release:** Phase 2 foundation · `v0.9.2`  
**Depends on:** ADR-009, ADR-010, ADR-013  

---

## Business Context

Operators need security observability: auth events, authz denials, audit highlights, posture — without waiting for full Dashboard Studio.

## Problem Statement

Security UI is fragmented; no coherent dashboard framework for security events, authn/authz metrics, and alerts.

## Decision

1. Security Dashboard Framework: APIs/widgets for posture, authz denies, audit highlights, vulns, compliance summary.  
2. Sources: audit (ADR-013), vuln feed (ADR-018), compliance (ADR-012), gateway metrics (authn/authz).  
3. Phase 2: API contracts + baseline web views (not Studio).  
4. RBAC-gated (`security:read`).  
5. Security alerts hooks (log/metric thresholds) — foundation.  
6. Delivered as product module surfaces; Studio integration later (ADR-019).

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Wait for Phase 5 Studio | Visibility needed now |
| Grafana-only | Weak tenant product UX |
| Static mocks | Misleading |

## Consequences

**Positive:** Operator visibility.  
**Negative:** UI scope must stay time-boxed.

## Security Impact

Dashboards themselves are sensitive — strict AuthZ; minimize PII.

## Performance Impact

Aggregate queries — cache short TTL; avoid heavy scans on homepage.

## Scalability Impact

Per-tenant aggregates; future move to metrics store.

## Compliance Impact

Supports security monitoring control evidence.

## Rollback Strategy

Hide routes via flag; APIs remain inert.

## Future Considerations

Studio widgets, SIEM export, SOAR hooks.

## Decision Status

**Accepted** — EAB 2026-07-11 (foundation).  
