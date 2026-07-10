# OpsEdge360 — Frozen Architecture

**Document ID:** OE360-ARCH-FROZEN-001  
**Status:** FROZEN  
**Effective:** 2026-07-10  
**Companion:** `FROZEN_PRODUCT_VISION.md`, `FROZEN_ROADMAP.md`, `INDUSTRY_SOLUTION_PACKS.md`  

---

## 1. Freeze statement

This document freezes the **architectural shape** of OpsEdge360 for Phases 1–6. Detailed component decisions are recorded as ADRs. Implementation must not violate these constraints without a new ADR and architecture amendment.

### Permanent module/plugin principle (EAB 2026-07-11)

**Every new enterprise capability must be implemented as a module or plugin, never tightly coupled into the platform core.**  
See `MODULE_PLUGIN_PRINCIPLE.md`. Applies to Quantum Shield, AI Copilot, packs, dashboards, connectors, workflow, marketplace, and SDK.

---

## 2. Logical architecture (frozen)

```
┌─────────────────────────────────────────────────────────────────┐
│  Clients: Web Console · Agents · Integrations · Pack UIs        │
├─────────────────────────────────────────────────────────────────┤
│  API Gateway (NestJS) — /api/v1 · Auth · Tenant · RBAC (Ph2)    │
├─────────────────────────────────────────────────────────────────┤
│  Core Microservices (industry-agnostic)                         │
│  discovery · cmdb · observability · transactions · security     │
│  compliance-engine · remediation · analytics · scheduler        │
│  config-management · governance · (future core services)        │
├─────────────────────────────────────────────────────────────────┤
│  Solution Pack Layer (optional)                                 │
│  Banking360 · Retail360 · Healthcare360 · …                     │
│  Country Compliance Packs (IN, US, UK, EU, …)                   │
├─────────────────────────────────────────────────────────────────┤
│  Shared Platform                                                │
│  shared-db · event-bus · cache · shared-security · plugin-sdk   │
│  agent-framework · shared-logger · shared-types · platform-cfg  │
├─────────────────────────────────────────────────────────────────┤
│  Data & Infra                                                   │
│  PostgreSQL (trinetra360) · Redis · Kafka · (OpenSearch Ph6)    │
│  Nginx TLS · Docker Compose (now) · Helm (Ph6)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Core vs pack boundary (frozen)

| Layer | May contain industry-specific logic? |
|-------|--------------------------------------|
| Gateway auth, tenancy, RBAC | No |
| discovery / cmdb / observability / security core | No (generic connectors/CI types only) |
| compliance **engine** | No — evaluates pack-supplied rules |
| `services/*` Banking-only endpoints as required boot deps | **Forbidden** |
| `apps/web` Banking360 routes | Allowed only behind pack enablement (Phase 5 full; Phase 1: document + soft soft-decouple) |
| Pack metadata / templates / controls | Yes |
| Seeds for demos | Yes — never required for core migrate |

---

## 4. Service topology (current production)

**In production compose today:** discovery, cmdb, observability, compliance, transactions, security, api-gateway, web, nginx, migrate + postgres/redis/kafka.

**Exist but not in prod compose:** remediation, analytics, quantum, governance, scheduler, config-management, ai-agents.

Phase 1 decides wiring/posture; Phase 6 scales via K8s.

---

## 5. Cross-cutting standards (frozen)

| Concern | Standard |
|---------|----------|
| API | `/api/v1`, OpenAPI 3.1 trajectory, additive versioning |
| Auth | JWT (+ SSO); API keys Phase 2; MFA Phase 2/6 |
| Tenancy | `tenant_id` / `X-Tenant-ID`; RLS later |
| Events | Kafka topics via `@opsedge360/event-bus` |
| Logs | Structured JSON logger (new code); migrate legacy |
| Telemetry | OpenTelemetry + Prometheus |
| Health | `/health`, `/ready`, `/live`, `/metrics` (converge) |
| Secrets | Env now; Vault/KMS Phase 6 |
| Plugins | `@opsedge360/plugin-sdk` |
| Agents | `@opsedge360/agent-framework` + platform agents |

---

## 6. Non-negotiable production locks

- Domains, DB name `trinetra360`, volume names, Nginx SSL/routing  
- Migrations 001–014 immutable; new work = new migration numbers only  
- Backward-compatible APIs  
- No commits to `main` without PR  

---

## 7. Quantum / advanced modules

`quantum` and similar advanced modules remain **optional core-adjacent services**, not industry packs. They must not block core GA paths and are not required in prod compose until explicitly promoted.

---

## 8. ADR requirement

Every major component change in a phase requires an ADR under `docs/adr/` **before** production code for that component.

Phase 1 ADRs: see `docs/adr/README.md`.
