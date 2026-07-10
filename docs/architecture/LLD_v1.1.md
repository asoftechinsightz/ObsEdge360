# Low-Level Design (LLD) v1.1

**Document ID:** OE360-LLD-1.1  
**Version:** 1.1  
**Status:** PROPOSED  
**Supersedes:** `LLD_v1.0.md` for security middleware details when Accepted  

---

## 1. Gateway security pipeline (target)

```text
Request
  → TLS terminated at Nginx
  → Nest middleware / guards
      1. Public allowlist? → skip AuthN
      2. Agent route? → validate X-Agent-Key
      3. Else validate JWT / session
      4. Bind tenant from token (ignore spoofed header)
      5. RBAC permission check (deny default)
      6. ABAC attribute check
      7. Emit audit on deny / on mutation
  → Controller / proxy
```

## 2. Permission model (logical)

- Permission codes: `resource:action` (e.g. `cmdb:read`, `security:write`)  
- Roles map many permissions  
- Users/service accounts map roles per tenant  
- Super-admin / platform roles audited heavily  

Exact table names follow existing Sprint 0 RBAC schema where present; additive migrations only.

## 3. Audit event (logical fields)

`id, timestamp, tenant_id, actor_id, actor_type, action, resource_type, resource_id, outcome, ip, request_id, metadata`

Append-oriented; no silent updates.

## 4. Secrets provider (logical)

```text
SecretsProvider.get(key): string
Backend: EnvSecretsProvider (Phase 2)
Future: VaultSecretsProvider (Phase 6)
```

## 5. Session (ADR-008 target)

Prefer HttpOnly + Secure + SameSite cookie set by gateway (BFF) **or** memory access token + HttpOnly refresh — final choice locked in ADR-008 acceptance notes before coding.

## 6. Web

- Security dashboard routes behind auth + `security:read`  
- Stop relying on JS-readable JWT for API calls once BFF lands  

## 7. Testing hooks

Export pure functions for permission/tenant decisions for unit tests; keep Nest guards thin.

## 8. Non-goals

Plugin sandbox, Studio widgets, LLM gateway internals (later ADRs).
