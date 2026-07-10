# ADR-027: Workflow Engine

**Decision Status:** Proposed  
**Date:** 2026-07-11  
**Deciders:** EAB (pending)  
**Phase / Release:** `v0.9.5` Dashboard Studio & Workflow Automation  
**Depends on:** ADR-010, ADR-013, ADR-020  

---

## Business Context

Enterprise ops need approval workflows (remediation, access requests, compliance exceptions) with auditability.

## Problem Statement

No durable workflow engine; risk of ad-hoc approval hacks in services.

## Decision (proposed)

1. Workflow Engine as a **module/plugin**: definitions, instances, tasks, timers.  
2. Human-in-the-loop for high-risk actions (ties to AI later).  
3. RBAC on who may approve; full audit.  
4. Core platform invokes workflows via API — engine not embedded in gateway.  
5. Packs may ship workflow templates.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Hardcoded if/else approvals | Unmaintainable |
| External-only BPM | Weak tenancy integration |

## Consequences

**Positive:** Reusable automation. **Negative:** Engine complexity.

## Security Impact

Privilege escalation via misconfigured workflows — template review required.

## Performance Impact

Async; SLAs for task latency.

## Scalability Impact

Horizontal workers; durable state in Postgres.

## Compliance Impact

Supports documented approval evidence.

## Rollback Strategy

Disable new workflow starts; complete in-flight manually.

## Future Considerations

Visual designer in Studio; marketplace workflow packs.

## Decision Status

**Proposed** — before Phase 5 / `v0.9.5`.  
