# ADR-014: Secrets Management

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** SRE Lead, Security Architect  
**Phase:** 2 (foundation) · Phase 6 (Vault/KMS hardening)  
**Depends on:** ADR-009  

---

## Context

Production secrets live primarily in host `.env` / compose environment. This is common for VPS bootstrap but risks sprawl, weak rotation, and accidental leakage into logs/images.

## Decision

**Phase 2 foundation:**

1. Inventory all secrets (DB, JWT, agent keys, Redis, Kafka, third-party).  
2. Standardize naming (`OE360_*` / documented env contract).  
3. Forbid secrets in git, client bundles, and logs (coding standards).  
4. Document rotation procedures for JWT signing key and agent keys.  
5. Optional: introduce a thin **secrets provider interface** in shared code (env backend now).  

**Phase 6 target:** HashiCorp Vault / cloud KMS backend behind the same interface; dynamic DB creds where feasible.

## Alternatives considered

| Alternative | Why rejected for Phase 2 |
|-------------|--------------------------|
| Full Vault now | Ops heavy before PRR maturity |
| Keep ad-hoc forever | Unacceptable debt |
| Sealed secrets in git | Still secret sprawl; wrong threat model |

## Consequences

**Positive:** Clear path to enterprise secret ops without blocking Phase 2 authz work.  
**Negative:** Env-file residual risk until Phase 6 (R-SEC-005).

## Compliance

- Production lock: do not break running deploy; change-control rotations.  
- Linked debt: TD-011.  
