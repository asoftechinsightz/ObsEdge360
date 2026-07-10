# Risk Register

**Document ID:** OE360-RISK-001  
**Status:** LIVING  
**Last updated:** 2026-07-10  
**Owner:** Security Architect + Chief Architect  

Severity: Critical · High · Medium · Low  
Status: Open · Mitigating · Accepted · Closed  

---

## Architecture risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-ARCH-001 | Unwired Sprint 0 features claimed as production | High | Phase 1 wire + Option B experimental | Docs drift | Architect | Mitigating |
| R-ARCH-002 | Industry logic leaks into core | Medium | Frozen pack policy; Banking360 flag | Soft coupling remains | Product | Open |
| R-ARCH-003 | Service sprawl without prod compose discipline | Medium | ADR-003; EAB for new services | Experimental drift | Architect | Open |

## Security risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-SEC-001 | XSS can steal JWT from non-HttpOnly cookie | High | ADR-008 Phase 2 | Present until Phase 2 | Security | Open |
| R-SEC-002 | RBAC/ABAC not enforced | High | ADR-010 Phase 2 | Present | Security | Open |
| R-SEC-003 | Weak multi-tenant isolation | High | ADR-011 Phase 2 | Present | Security | Open |
| R-SEC-004 | Agent routes public + key secrecy | Medium | ADR-004; rotate keys; TLS | Key leak = agent control | Security | Accepted (interim) |
| R-SEC-005 | Secrets in env files on VPS | Medium | ADR-014; restrict host access | File theft | SRE | Open |
| R-SEC-006 | Incomplete mutation audit trail | High | ADR-013 | Compliance gap | Security | Open |

## Performance risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-PERF-001 | No formal p95 baselines in staging | Medium | Phase 1 PRR performance section | Unknown capacity | SRE | Open |
| R-PERF-002 | Topology/pipeline unbounded payloads | Medium | Pagination/limits Phase 2–3 | DoS-ish load | Architect | Open |

## Compliance risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-COMP-001 | Compliance rule engine not enterprise-grade | Medium | ADR-012 Phase 2+ | Pack claims overstated | Compliance | Open |
| R-COMP-002 | Evidence/export incomplete for auditors | Medium | Phase 2 audit + later compliance depth | Manual evidence | Security | Open |

## Operational risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-OPS-001 | Phase 1 ops evidence incomplete (PRR open) | High | Complete PRR + staging | Phase 2 blocked (correct) | SRE | Open |
| R-OPS-002 | Backup/restore not recently drilled | High | PRR ops section; `BACKUP-RESTORE.md` | Data loss on incident | SRE | Open |
| R-OPS-003 | Alerting not verified | Medium | PRR + Phase 3 monitoring | Silent failure | SRE | Open |
| R-OPS-004 | Manual deploy / no CD | Medium | Runbooks; Phase 6 CD | Human error | SRE | Accepted (interim) |

## AI risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-AI-001 | Stub agents presented as autonomous AI | Medium | Docs honesty; Phase 4 real AI | Customer expectation | Product | Open |
| R-AI-002 | Future LLM data leakage / prompt injection | High | Phase 4 ADRs; human-in-loop | N/A until Phase 4 | Security | Deferred |
| R-AI-003 | Ungrounded remediation actions | High | No auto-remediate without approval | N/A until Phase 4 | Architect | Deferred |

## Third-party dependency risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-DEP-001 | Critical CVEs in images/deps | High | Trivy CRITICAL gate (ADR-007) | HIGH non-blocking | SRE | Mitigating |
| R-DEP-002 | Registry/TLS/npm supply chain | Medium | Lockfiles; private registry later | Upstream compromise | SRE | Open |
| R-DEP-003 | Kafka/Redis/Postgres version drift | Low | Pin images in compose | Surprise upgrades | SRE | Open |

---

## Quantum / advanced security (forward-looking)

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-Q-001 | Quantum service present but immature | Low | ADR-016; keep non-blocking for Phase 2 core | Over-claim | Architect | Deferred |

---

## Review cadence

Update at PRR, phase exit, and when accepting High/Critical residual risk via EAB.
