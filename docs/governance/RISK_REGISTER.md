# Risk Register

**Document ID:** OE360-RISK-001  
**Status:** LIVING  
**Last updated:** 2026-07-10  
**Owner:** Security Architect + Chief Architect  

Severity: Critical · High · Medium · Low  
Status: Open · Mitigating · Accepted · Closed  

**Context:** Phase 1 ✅ Approved with Operational Conditions (`v0.9.1`). Phase 2 planning approved; coding blocked until plan pack Accepted.

---

## Architecture risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-ARCH-001 | Unwired Sprint 0 features claimed as production | High | Phase 1 deployed + Option B | Docs drift | Architect | **Closed** (deployed) |
| R-ARCH-002 | Industry logic leaks into core | Medium | Frozen pack policy; Banking360 flag | Soft coupling | Product | Open |
| R-ARCH-003 | Service sprawl without prod compose discipline | Medium | ADR-003; EAB for new services | Experimental drift | Architect | Open |

## Security risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-SEC-001 | XSS can steal JWT from non-HttpOnly cookie | High | ADR-008 in Phase 2 | Present until M5 | Security | Open |
| R-SEC-002 | RBAC/ABAC not enforced | High | ADR-010 Phase 2 coding after approval | Present | Security | Open |
| R-SEC-003 | Weak multi-tenant isolation | High | ADR-011 Phase 2 | Present | Security | Open |
| R-SEC-004 | Agent routes public + key secrecy | Medium | ADR-004; OC-3 validation pending | Key leak | Security | Accepted (interim) |
| R-SEC-005 | Secrets in env files on VPS | Medium | ADR-014 foundation; host ACL | File theft | SRE | Open |
| R-SEC-006 | Incomplete mutation audit trail | High | ADR-013 Phase 2 | Compliance gap | Security | Open |
| R-SEC-007 | Public data-plane ports | High | Localhost binds deployed 2026-07-10 | Regress on bad compose | SRE | **Mitigating** |

## Performance risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-PERF-001 | No formal p95 baselines in staging | Medium | Phase 1 smoke OK; Phase 2 perf assessment | Limited soak data | SRE | Mitigating |
| R-PERF-002 | Topology/pipeline unbounded payloads | Medium | Limits in Phase 2–3 | DoS-ish load | Architect | Open |
| R-PERF-003 | AuthZ/audit latency regression | Medium | `PHASE2_PERFORMANCE_IMPACT.md` budgets | Flag/rollback | Eng | Open |

## Compliance risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-COMP-001 | Compliance rule engine not enterprise-grade | Medium | ADR-012 foundation in Phase 2 | Pack claims | Compliance | Open |
| R-COMP-002 | Evidence/export incomplete for auditors | Medium | Audit + later depth | Manual evidence | Security | Open |

## Operational risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-OPS-001 | Phase 1 ops evidence incomplete | High | PRR PASS WITH CONDITIONS; Phase 1 approved w/ OC | OC-1…4 open | SRE | **Mitigating** |
| R-OPS-002 | Backup/restore not drilled | High | Backup exists; **restore drill OC-1** | Data loss | SRE | Open |
| R-OPS-003 | Alerting not verified | Medium | Phase 3 monitoring | Silent failure | SRE | Open |
| R-OPS-004 | Manual deploy / no CD | Medium | Deploy scripts + runbooks; Phase 6 CD | Human error | SRE | Accepted (interim) |
| R-OPS-005 | Disk utilization warning (≥80%) | Medium | Thresholds 80/90; expand/retention | Fill-up | SRE | **Open (Warning)** |
| R-OPS-006 | Restart/recovery not formally tested | Medium | OC-2 container restart validation | Unknown MTTR | SRE | Open |

## AI risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-AI-001 | Stub agents presented as autonomous AI | Medium | Docs honesty; Phase 4 | Expectation | Product | Open |
| R-AI-002 | Future LLM data leakage / prompt injection | High | Phase 4 ADRs | N/A | Security | Deferred |
| R-AI-003 | Ungrounded remediation actions | High | Human-in-loop | N/A | Architect | Deferred |

## Third-party dependency risks

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-DEP-001 | Critical CVEs in images/deps | High | Trivy CRITICAL gate | HIGH non-blocking | SRE | Mitigating |
| R-DEP-002 | Registry/TLS/npm supply chain | Medium | Lockfiles | Upstream | SRE | Open |
| R-DEP-003 | Kafka/Redis/Postgres version drift | Low | Pin images | Surprise upgrades | SRE | Open |

## Quantum / advanced security

| ID | Risk | Sev | Mitigation | Residual | Owner | Status |
|----|------|-----|------------|----------|-------|--------|
| R-Q-001 | Quantum service immature / over-claim | Low | ADR-016 design-only in Phase 2 | Over-claim | Architect | Deferred |

---

## Review cadence

Update at PRR, phase exit, and when accepting High/Critical residual risk via EAB.
