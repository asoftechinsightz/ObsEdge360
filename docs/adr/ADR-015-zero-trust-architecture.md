# ADR-015: Zero Trust Architecture

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Security Architect, Chief Architect  
**Phase:** 2 (foundation)  
**Depends on:** ADR-009, ADR-010, ADR-011, ADR-014  

---

## Context

Classic perimeter trust (“inside Docker network = trusted”) is insufficient for enterprise Zero Trust. OpsEdge360 should move toward continuous verification without requiring full service mesh in Phase 2.

## Decision

**Phase 2 Zero Trust foundation:**

1. **Never trust network location alone** — authorize every gateway request.  
2. **Strong identity** for users, agents, and (later) workloads.  
3. **Least privilege** via RBAC/ABAC deny-by-default.  
4. **Short-lived credentials** direction (session hardening ADR-008).  
5. **Audit** all sensitive decisions (ADR-013).  
6. **Segment** experimental services off production compose (already ADR-003).  

**Explicitly deferred:** full mTLS service mesh, device posture, continuous risk-based auth — Phase 6 / later ADRs.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| “VPN = secure enough” | Not product-grade Zero Trust |
| Mesh mTLS in Phase 2 | Premature operational load |
| Ignore ZT until Phase 6 | Weak enterprise narrative |

## Consequences

**Positive:** Credible ZT roadmap grounded in enforceable controls.  
**Negative:** Must avoid over-claiming “Zero Trust certified” after Phase 2 foundation only.

## Compliance

- Marketing/docs must say “foundation” until later phases.  
