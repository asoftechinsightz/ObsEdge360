# ADR-011: Multi-Tenant Security Model

**Decision Status:** Accepted  
**Date:** 2026-07-10 · **Accepted:** 2026-07-11  
**Deciders:** EAB  
**Phase / Release:** Phase 2 · `v0.9.2`  
**Depends on:** ADR-009, ADR-010  

---

## Business Context

OpsEdge360 must safely host multiple organizations with hard data boundaries for enterprise and future SaaS modes.

## Problem Statement

Tenant context is partially present (headers/claims) but isolation is not validated end-to-end. Client-supplied tenant headers can be spoofed.

## Decision

1. Tenant ID is a first-class security attribute from authenticated identity (JWT claim preferred).  
2. Reject/ignore conflicting client `X-Tenant-Id` except audited platform impersonation.  
3. All tenant-scoped queries filter by tenant_id.  
4. Gateway attaches verified tenant context downstream.  
5. Shared/platform data explicitly modeled.  
6. Cross-tenant negative tests mandatory.  
7. Packs do not invent alternate tenancy models.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|--------------|
| Trust header-only tenant | Trivial spoofing |
| DB-per-tenant in Phase 2 | Ops cost; defer |
| Soft UI-only tenancy | Not enterprise-acceptable |

## Consequences

**Positive:** Clear isolation story.  
**Negative:** Schema/query audit; possible additive migrations.

## Security Impact

Mitigates R-SEC-003 / TD-003. Residual: shared-host VPS blast radius.

## Performance Impact

Tenant filters usually improve selectivity; index `tenant_id` on hot tables.

## Scalability Impact

Supports many tenants on shared DB; future shard-by-tenant remains open.

## Compliance Impact

Required for multi-customer confidentiality commitments.

## Rollback Strategy

Prior gateway without hard binder; data rows remain tenant-tagged (safe).

## Future Considerations

RLS in Postgres, region pinning, tenant-level encryption keys.

## Decision Status

**Accepted** — EAB 2026-07-11.  
