# ADR-007: CI Security Gate (Trivy CRITICAL)

**Status:** Proposed  
**Date:** 2026-07-10  
**Deciders:** DevOps Architect, Security Architect  
**Phase:** 1  

---

## Context

GitHub Actions runs Trivy with `exit-code: '0'`, so CRITICAL/HIGH findings never fail the pipeline. This weakens supply-chain assurance claimed in Sprint 0 / NFR docs.

## Decision

1. Set Trivy filesystem (and image scan where present) to **fail on CRITICAL** (`exit-code: 1` when CRITICAL found).
2. HIGH may remain warning-only in Phase 1 (document); promote HIGH to failing in Phase 2 if noise is manageable.
3. Document exception process: temporary `continue-on-error` only with Security Architect written waiver in PR.
4. Do not implement full CD in Phase 1 (remains Phase 6).

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Keep non-blocking scans | False sense of security |
| Fail on all HIGH immediately | May block delivery on transitive noise |
| Only manual scans | Not enforceable |

## Consequences

**Positive:** Real quality gate.  
**Negative:** May require dependency upgrades during Phase 1.  

## Related hardening (docs-only in Phase 1 unless trivial)

- Recommend binding Postgres/Redis/Kafka to localhost / internal network in prod runbooks (no lock violation).
