# ADR-013: Audit Logging Architecture

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** Security Architect, SRE Lead  
**Phase:** 2  
**Depends on:** ADR-009  

---

## Context

Structured application logs exist partially; security-relevant **audit events** (who did what, when, to which tenant/resource, outcome) are incomplete for enterprise forensics and compliance.

## Decision

1. Introduce a dedicated **audit event schema**: actor, tenant, action, resource, outcome, ip, requestId, timestamp, metadata.  
2. Emit audits for: login/logout, authz deny, mutations (create/update/delete), admin/impersonation, secret/key changes, config changes.  
3. **Gateway** is primary emitter for HTTP API audits; services may emit domain audits.  
4. Storage: PostgreSQL audit tables initially (append-oriented); retention policy documented.  
5. Audit records are **update-restricted** (no silent edits); admin access audited.  
6. Correlation with request/access logs without storing secrets or raw passwords.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| App logs only | Not queryable/immutable enough |
| External SIEM only in Phase 2 | Still need first-party audit API |
| Sync audit in every service without schema | Inconsistent |

## Consequences

**Positive:** Forensics + compliance evidence.  
**Negative:** Volume/retention costs; PII minimization required.

## Compliance

- Linked debt: TD-010 · risk: R-SEC-006.  
- OpenAPI for audit query APIs if exposed.  
