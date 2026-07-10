# ADR-017: Security Dashboard Architecture

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Product Owner, Security Architect, Frontend Lead  
**Phase:** 2  
**Depends on:** ADR-009, ADR-010, ADR-013  

---

## Context

Security UI exists in places, but there is no coherent **security dashboard framework** for posture, authz events, vulnerabilities, and compliance summaries. Phase 5 Studio must not be required for basic security visibility.

## Decision

1. Define a **Security Dashboard Framework**: widgets/APIs for posture score, recent authz denies, audit highlights, open vulns, compliance pass rate, tenant security summary.  
2. Data sourced from audit (ADR-013), vuln feed (ADR-018), compliance evaluations (ADR-012), gateway metrics.  
3. Phase 2 delivers **API contracts + baseline web views** (not full Dashboard Studio).  
4. RBAC-gated (`security:read` / admin).  
5. Industry packs may add widgets later without forking core.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Wait for Phase 5 Studio | Security visibility needed sooner |
| Grafana-only | Not tenant-aware product UX |
| Static mock dashboards | Misleading |

## Consequences

**Positive:** Operator visibility; supports PRR/monitoring story.  
**Negative:** UI scope must be time-boxed to avoid Phase 5 bleed.

## Compliance

- OpenAPI for dashboard APIs.  
- No PII over-exposure in widgets.  
