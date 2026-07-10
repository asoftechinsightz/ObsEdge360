# ADR-013: Audit Logging Architecture

**Decision Status:** Accepted  
**Date:** 2026-07-10 · **Accepted:** 2026-07-11  
**Deciders:** EAB  
**Phase / Release:** Phase 2 · `v0.9.2`  
**Depends on:** ADR-009  

---

## Business Context

Forensics, compliance, and security operations require an accountable record of who did what, when, to which tenant/resource.

## Problem Statement

Application logs are partial; security-relevant audit events for authz denies and mutations are incomplete.

## Decision

1. Dedicated audit schema: actor, tenant, action, resource, outcome, ip, requestId, timestamp, metadata.  
2. Emit for: login/logout, authz deny, mutations, admin/impersonation, key/config changes.  
3. Gateway is primary HTTP audit emitter; services may emit domain audits.  
4. PostgreSQL append-oriented storage initially; retention documented.  
5. Update-restricted; admin access audited.  
6. No secrets/passwords in audit payloads.  
7. Feed security observability (events, dashboards, alerts).

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| App logs only | Weak query/immutability |
| SIEM-only in Phase 2 | Still need first-party audit API |
| Unschema’d per-service logs | Inconsistent |

## Consequences

**Positive:** Forensics + compliance evidence.  
**Negative:** Volume/retention cost; PII minimization required.

## Security Impact

Mitigates R-SEC-006 / TD-010; improves repudiation controls.

## Performance Impact

Sync insert on mutations — budgeted in perf assessment; async path if needed via ADR addendum.

## Scalability Impact

Partition/archive by time; future ship to SIEM without changing emitters.

## Compliance Impact

Core evidence collection framework for access and change accountability.

## Rollback Strategy

Stop emitters via flag; retain table; prior release without audit UI.

## Future Considerations

WORM storage, SIEM connectors, tamper-evident hashing.

## Decision Status

**Accepted** — EAB 2026-07-11.  
