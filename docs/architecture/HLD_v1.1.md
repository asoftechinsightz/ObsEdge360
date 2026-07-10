# High-Level Design (HLD) v1.1

**Document ID:** OE360-HLD-1.1  
**Version:** 1.1  
**Status:** PROPOSED (supersedes v1.0 for Phase 2+ security concerns when Accepted)  
**Effective:** TBD on EAB acceptance  
**Supersedes:** `HLD_v1.0.md` for AuthZ/tenancy/audit/secrets topics; v1.0 remains frozen historical baseline  

---

## 1. Purpose of v1.1

Extend the platform HLD for **Enterprise Security & Compliance Foundation** (`v0.9.2`) without rewriting the entire v1.0 baseline.

## 2. System context (updated)

```text
[Operators] → TLS → Nginx → Web / API Gateway
                              │
                              ├─ AuthN (JWT / session per ADR-008)
                              ├─ AuthZ (RBAC + ABAC) deny-default
                              ├─ Tenant binder (token-bound)
                              ├─ Audit emitter
                              └─ Proxy → core services → PostgreSQL / Redis / Kafka
[Agents] → TLS → Gateway (X-Agent-Key) → discovery agent APIs
```

## 3. Security control plane

| Control | Location | Phase 2 posture |
|---------|----------|-----------------|
| Authentication | Gateway | JWT + session hardening |
| Authorization | Gateway | RBAC + ABAC enforced |
| Tenancy | Gateway + data access | Hard isolation validated |
| Audit | Gateway (+ services) | Mutation & authz deny events |
| Secrets | Shared provider interface | Env backend now; Vault later |
| Compliance | Compliance service | Rule metadata foundation |
| Visibility | Security dashboard | Foundation APIs + UI |
| Zero Trust | Architecture | Foundation (no mesh yet) |
| Quantum Shield | Design | Non-blocking |

## 4. Unchanged from v1.0

Core service set in prod compose, pack boundary, production locks, Compose-first deploy, industry-agnostic core.

## 5. Quality attributes (delta)

| Attribute | v1.1 target |
|-----------|-------------|
| Security | Enforceable AuthZ + audit |
| Confidentiality | Tenant isolation tested |
| Accountability | Audit trail for sensitive actions |
| Operability | Feature-flag / rollback for AuthZ |

## 6. Related

`LLD_v1.1.md` · ADR-009…018 · `PHASE2_IMPLEMENTATION_PLAN.md`  
