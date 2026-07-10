# Architecture Decision Records — Index

**Rule:** No production code for a capability until its ADR is **Accepted** (EAB).  
**Phase 2+ code:** Blocked until prior phase final approval + DoR + Accepted ADRs + approved plan.

## Phase 1 ADRs

| ID | Title | Status |
|----|-------|--------|
| [ADR-001](./ADR-001-industry-agnostic-core-and-solution-packs.md) | Industry-agnostic core and solution packs | Accepted (Phase 1) |
| [ADR-002](./ADR-002-sprint0-gateway-wiring.md) | Sprint 0 API gateway wiring | Accepted (Phase 1) |
| [ADR-003](./ADR-003-scheduler-config-mgmt-prod-posture.md) | Scheduler and config-management production posture | Accepted — Option B |
| [ADR-004](./ADR-004-agent-config-auth-model.md) | Agent configuration authentication model | Accepted (Phase 1) |
| [ADR-005](./ADR-005-gateway-health-probes.md) | API gateway health dependency probes | Accepted (Phase 1) |
| [ADR-006](./ADR-006-auth-middleware-public-routes.md) | Auth middleware public routes | Accepted (Phase 1) |
| [ADR-007](./ADR-007-ci-security-gate.md) | CI security gate (Trivy CRITICAL) | Accepted (Phase 1) |
| [ADR-008](./ADR-008-session-cookie-hardening.md) | Session cookie hardening strategy | Accepted plan; implement Phase 2 |

## Phase 2 ADRs (Proposed)

| ID | Title | Status |
|----|-------|--------|
| [ADR-009](./ADR-009-security-architecture.md) | Enterprise Security Architecture | Proposed |
| [ADR-010](./ADR-010-rbac-abac-enforcement.md) | RBAC & ABAC Enforcement | Proposed |
| [ADR-011](./ADR-011-multi-tenant-security-model.md) | Multi-Tenant Security Model | Proposed |
| [ADR-012](./ADR-012-compliance-rule-engine.md) | Compliance Rule Engine | Proposed |
| [ADR-013](./ADR-013-audit-logging-framework.md) | Audit Logging Architecture | Proposed |
| [ADR-014](./ADR-014-secrets-management.md) | Secrets Management | Proposed |
| [ADR-015](./ADR-015-zero-trust-architecture.md) | Zero Trust Architecture | Proposed |
| [ADR-016](./ADR-016-quantum-shield-architecture.md) | Quantum Shield Architecture | Proposed (non-blocking) |
| [ADR-017](./ADR-017-security-dashboard-framework.md) | Security Dashboard Architecture | Proposed |
| [ADR-018](./ADR-018-vulnerability-management-framework.md) | Vulnerability Management Framework | Proposed |

## Later-phase ADRs (Proposed — documentation only)

| ID | Title | Primary phase | Status |
|----|-------|---------------|--------|
| [ADR-019](./ADR-019-dashboard-studio-architecture.md) | Dashboard Studio Architecture | 5 | Proposed |
| [ADR-020](./ADR-020-plugin-framework.md) | Plugin Framework | 5–6 | Proposed |
| [ADR-021](./ADR-021-ai-copilot-architecture.md) | AI Copilot Architecture | 4 | Proposed |
| [ADR-022](./ADR-022-llm-gateway.md) | LLM Gateway | 4 | Proposed |
| [ADR-023](./ADR-023-rag-architecture.md) | RAG Architecture | 4 | Proposed |
| [ADR-024](./ADR-024-industry-solution-pack-framework.md) | Industry Solution Pack Framework | 5 | Proposed |
| [ADR-025](./ADR-025-country-compliance-pack-framework.md) | Country Compliance Pack Framework | 5 | Proposed |

## Template

Context → Decision → Alternatives → Consequences → Compliance → Status.

## Governance

- EAB: `docs/governance/EXECUTIVE_ARCHITECTURE_BOARD.md`  
- Architecture baseline: `docs/architecture/ARCHITECTURE_BASELINE_v1.0.md`  
- Release framework: `docs/governance/RELEASE_GOVERNANCE_FRAMEWORK.md`  
