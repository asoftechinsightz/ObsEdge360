# Phase 2 — Implementation Waves

**Release:** `v0.9.2` Enterprise Security & Compliance Foundation  
**Strategy:** Implement by **security layer**, not by scattered features.  
**Cadence:** One wave at a time → validate → docs → approval → next wave.  

| Wave | WBS | Focus | SDS |
|------|-----|-------|-----|
| 1 | 2.1 | Identity & Authorization Spine | [SDS-2.1-RBAC.md](./sds/SDS-2.1-RBAC.md) — **Accepted** |
| 2 | 2.2 | Tenant Security | [SDS-2.2-TenantIsolation.md](./sds/SDS-2.2-TenantIsolation.md) — **Deployed** (`v0.9.2-wave2`) |
| 3 | 2.3 | Audit & Compliance Foundation | SDS-2.3-AuditFramework.md — **Authorized to start** |
| 4 | 2.4 | Secrets & Platform Security | SDS-2.4-Secrets.md |
| 5 | 2.5 | Security Observability | SDS-2.5-SecurityObservability.md |

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
