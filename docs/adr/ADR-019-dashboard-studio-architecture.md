# ADR-019: Dashboard Studio Architecture

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Product Owner, Chief Architect, Frontend Lead  
**Phase:** 5 (primary) — architecture recorded early for roadmap coherence  
**Depends on:** ADR-001, security ADRs for data access  

---

## Context

OpsEdge360 needs tenant-configurable dashboards (widgets, layouts, KPIs) without forking the web app per customer. Phase 5 delivers Studio; early ADR prevents ad-hoc dashboard code in core.

## Decision

1. **Dashboard Studio** is a metadata-driven UI builder: dashboard → layout → widgets → data queries.  
2. Widget data access goes through **gateway APIs** with RBAC/tenant checks — no direct DB from browser.  
3. Core ships a widget SDK; **solution packs** may contribute widgets.  
4. Persistence in PostgreSQL (`trinetra360`) with tenant scope.  
5. Phase 1–4 may ship **fixed** security/ops dashboards (ADR-017) without full Studio.  
6. No Studio production code until Phase 5 plan + this ADR Accepted.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Hardcoded dashboards only | Not enterprise-configurable |
| Embed third-party BI only | Weak product control / tenancy |
| Build Studio in Phase 2 | Distracts from security enforcement |

## Consequences

**Positive:** Clear separation of fixed vs studio dashboards.  
**Negative:** Two dashboard paths until Phase 5 consolidation.

## Compliance

- Pack policy (ADR-001) · DoR before Phase 5 code.  
