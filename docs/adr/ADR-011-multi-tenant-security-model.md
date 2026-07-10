# ADR-011: Multi-Tenant Security Model

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Security Architect, Chief Architect, Product Owner  
**Phase:** 2  
**Depends on:** ADR-009, ADR-010  

---

## Context

Tenant context is partially present (headers / claims) but isolation is not validated end-to-end. Enterprise customers require hard tenant boundaries for data, jobs, and admin actions.

## Decision

1. **Tenant ID** is a first-class security attribute from authenticated identity (JWT claim preferred over client-supplied header alone).  
2. **Reject or ignore** client `X-Tenant-Id` when it conflicts with token tenant (except platform super-admin with audited impersonation).  
3. **Data access:** all tenant-scoped queries filter by tenant_id; cross-tenant access denied.  
4. **Gateway:** attach verified tenant context to downstream requests.  
5. **Shared/platform data** explicitly modeled (not accidentally global).  
6. **Tests:** cross-tenant read/write negative tests mandatory.  
7. Solution packs remain tenant-installable modules, not alternate tenancy models.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Trust header-only tenant | Trivial spoofing |
| DB-per-tenant in Phase 2 | Ops cost; defer to Phase 6 options |
| Soft tenancy (UI only) | Not enterprise-acceptable |

## Consequences

**Positive:** Clear isolation story for customers and auditors.  
**Negative:** Schema/query audit required; possible additive migrations.

## Compliance

- DB impact reviewed under DoR.  
- Linked debt: TD-003 · risk: R-SEC-003.  
