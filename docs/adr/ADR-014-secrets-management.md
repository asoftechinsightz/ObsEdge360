# ADR-014: Secrets Management

**Decision Status:** Accepted  
**Date:** 2026-07-10 · **Accepted:** 2026-07-11  
**Deciders:** EAB  
**Phase / Release:** Phase 2 foundation · Vault/KMS Phase 6  
**Depends on:** ADR-009  

---

## Business Context

Enterprise deployments require controlled secret storage, rotation, and service identity — without blocking Phase 2 AuthZ delivery.

## Problem Statement

Secrets live mainly in host `.env` / compose env. Sprawl, weak rotation, and accidental log leakage are risks (R-SEC-005).

## Decision

**Phase 2 foundation:**

1. Inventory secrets (DB, JWT, agent keys, Redis, Kafka, third parties).  
2. Standardize naming; forbid secrets in git/client bundles/logs.  
3. Document rotation for JWT signing key and agent keys.  
4. Introduce `SecretsProvider` interface with **Env** backend now.  
5. Define service-to-service authentication direction (gateway→service shared network today; evolve to explicit service identity).  

**Later:** Vault/KMS backend behind same interface (Phase 6).

## Alternatives Considered

| Alternative | Why rejected for Phase 2 |
|-------------|--------------------------|
| Full Vault now | Ops heavy before process maturity |
| Sealed secrets in git | Wrong threat model |
| Ad-hoc forever | Unacceptable debt |

## Consequences

**Positive:** Clear path to enterprise secret ops.  
**Negative:** Env-file residual until Vault.

## Security Impact

Reduces accidental leakage; rotation strategy documented. Residual: host file theft.

## Performance Impact

Negligible (env reads at startup / cached).

## Scalability Impact

Interface allows per-environment backends without code forks.

## Compliance Impact

Supports secret management control narratives; full Vault evidence later.

## Rollback Strategy

Revert to direct `process.env` reads if provider bugs; no data migration.

## Future Considerations

Dynamic DB creds, per-tenant secrets, mTLS service identity.

## Decision Status

**Accepted** — EAB 2026-07-11 (foundation).  
