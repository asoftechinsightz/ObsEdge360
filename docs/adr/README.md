# Architecture Decision Records — Index

**Rule:** No production code for a capability until its ADR is **Accepted** (EAB).  
**Template:** [ADR_TEMPLATE.md](./ADR_TEMPLATE.md) — mandatory sections from ADR-009 onward.

## Phase 1 ADRs

| ID | Title | Status |
|----|-------|--------|
| [ADR-001](./ADR-001-industry-agnostic-core-and-solution-packs.md) | Industry-agnostic core and solution packs | Accepted |
| [ADR-002](./ADR-002-sprint0-gateway-wiring.md) | Sprint 0 API gateway wiring | Accepted |
| [ADR-003](./ADR-003-scheduler-config-mgmt-prod-posture.md) | Scheduler/config-mgmt posture | Accepted — Option B |
| [ADR-004](./ADR-004-agent-config-auth-model.md) | Agent configuration auth | Accepted |
| [ADR-005](./ADR-005-gateway-health-probes.md) | Gateway health probes | Accepted |
| [ADR-006](./ADR-006-auth-middleware-public-routes.md) | Auth middleware public routes | Accepted |
| [ADR-007](./ADR-007-ci-security-gate.md) | CI Trivy CRITICAL gate | Accepted |
| [ADR-008](./ADR-008-session-cookie-hardening.md) | Session cookie hardening | Accepted plan — implement in `v0.9.2` |

## Phase 2 ADRs (`v0.9.2`) — Accepted 2026-07-11

| ID | Title | Status |
|----|-------|--------|
| [ADR-009](./ADR-009-security-architecture.md) | Enterprise Security Architecture | **Accepted** |
| [ADR-010](./ADR-010-rbac-abac-enforcement.md) | RBAC & ABAC Enforcement | **Accepted** |
| [ADR-011](./ADR-011-multi-tenant-security-model.md) | Multi-Tenant Security Model | **Accepted** |
| [ADR-012](./ADR-012-compliance-rule-engine.md) | Compliance Rule Engine | **Accepted** |
| [ADR-013](./ADR-013-audit-logging-framework.md) | Audit Logging Architecture | **Accepted** |
| [ADR-014](./ADR-014-secrets-management.md) | Secrets Management | **Accepted** |
| [ADR-015](./ADR-015-zero-trust-architecture.md) | Zero Trust Architecture | **Accepted** |
| [ADR-016](./ADR-016-quantum-shield-architecture.md) | Quantum Shield (design/module) | **Accepted** (design-only for v0.9.2) |
| [ADR-017](./ADR-017-security-dashboard-framework.md) | Security Dashboard Architecture | **Accepted** |
| [ADR-018](./ADR-018-vulnerability-management-framework.md) | Vulnerability Management Framework | **Accepted** |

## Later-phase ADRs (Proposed — before Phase 3+)

| ID | Title | Target | Status |
|----|-------|--------|--------|
| [ADR-019](./ADR-019-dashboard-studio-architecture.md) | Dashboard Studio | v0.9.5 | Proposed |
| [ADR-020](./ADR-020-plugin-framework.md) | Plugin & Extension Framework | v0.9.5–0.9.7 | Proposed |
| [ADR-021](./ADR-021-ai-copilot-architecture.md) | AI Copilot | v0.9.4 | Proposed |
| [ADR-022](./ADR-022-llm-gateway.md) | LLM Gateway | v0.9.4 | Proposed |
| [ADR-023](./ADR-023-rag-architecture.md) | RAG Architecture | v0.9.4 | Proposed |
| [ADR-024](./ADR-024-industry-solution-pack-framework.md) | Industry Solution Packs | v0.9.6 | Proposed |
| [ADR-025](./ADR-025-country-compliance-pack-framework.md) | Country Compliance Packs | v0.9.6 | Proposed |
| [ADR-026](./ADR-026-notification-event-framework.md) | Notification & Event Framework | v0.9.3 | Proposed |
| [ADR-027](./ADR-027-workflow-engine.md) | Workflow Engine | v0.9.5 | Proposed |
| [ADR-028](./ADR-028-public-sdk-marketplace.md) | Public SDK & Marketplace | v0.9.7 | Proposed |

## Permanent architecture principle

**Every new enterprise capability must be a module or plugin — never tightly coupled into the platform core.**  
See `docs/governance/MODULE_PLUGIN_PRINCIPLE.md`.
