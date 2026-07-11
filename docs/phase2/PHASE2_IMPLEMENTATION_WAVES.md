# Phase 2 — Implementation Waves

**Release:** `v0.9.2` Enterprise Security & Compliance Foundation  
**Strategy:** Implement by **security layer**, not by scattered features.  
**Cadence:** One wave at a time → validate → docs → approval → next wave.  

| Wave | WBS | Focus | SDS |
|------|-----|-------|-----|
| 1 | 2.1 | Identity & Authorization Spine | [SDS-2.1-RBAC.md](./sds/SDS-2.1-RBAC.md) — **Closed** |
| 2 | 2.2 | Tenant Security | [SDS-2.2-TenantIsolation.md](./sds/SDS-2.2-TenantIsolation.md) — **Closed** (`v0.9.2-wave2`) |
| 3 | 2.3 | Audit & Compliance Foundation | [SDS-2.3-AuditFramework.md](./sds/SDS-2.3-AuditFramework.md) — **Closed** (`v0.9.2-wave3`) |
| 4 | 2.4 | Secrets & Platform Security | [SDS-2.4-Secrets.md](./sds/SDS-2.4-Secrets.md) — **Closed** (`v0.9.2-wave4`) |
| 5 | 2.5 | Enterprise Identity & Trust | [SDS-2.5-IdentityTrust.md](./sds/SDS-2.5-IdentityTrust.md) — **Closed** (`v0.9.2-wave5`) |
| 6 | 2.6 | Security Observability | [SDS-2.6-SecurityObservability.md](./sds/SDS-2.6-SecurityObservability.md) — **Implementing** |
| 7 | 2.7 | mTLS / SPIFFE Workload Identity | Planned (EAB progression) |

**EAB note (2026-07-11):** Wave 5 re-scoped from Security Observability → Identity & Trust. Observability becomes Wave 6.

**Wave 3 gate:** EAB must Accept SDS-2.3 before implementation. Planning: [WAVE3_PLANNING.md](./WAVE3_PLANNING.md).  
**Remote push:** Hold branch + `v0.9.2-wave2` until Wave 3 planning pack is complete (EAB).


## Engineering rules (binding)

1. No breaking API changes.  
2. No duplicated authorization logic.  
3. No tenant ID from client without server-side validation.  
4. Every security deny/mutation generates an audit log (as waves land).  
5. Every new API requires OpenAPI documentation.  
6. Every security feature requires unit, integration, and negative tests.  
7. No hard-coded roles/permissions in business logic — use catalog + DB.  
8. All authorization decisions flow through the centralized policy engine (`shared-security` + gateway guards).  

## Looking ahead (roadmap recommendation)

EAB may reorder preview releases so AI leads observability:

- v0.9.3 AI & Agentic AI Foundation  
- v0.9.4 Advanced Observability & SRE  
- … (see `RELEASE_NAMING.md` for formal freeze updates via EAB)  
