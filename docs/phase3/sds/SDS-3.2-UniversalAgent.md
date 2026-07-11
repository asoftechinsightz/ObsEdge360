# SDS-3.2 — Universal Agent

**Document ID:** OE360-SDS-3.2  
**Wave:** Phase 3 / Wave 2 — Universal Agent  
**Release:** `v0.9.3`  
**Status:** ✅ **APPROVED FOR IMPLEMENTATION**  
**Depends on:** Phase 3 Wave 1 (`v0.9.3-wave1`)

---

## 1. Objectives

Deliver a production **Universal Agent** control plane and cross-platform runtime: secure enrollment, inventory, heartbeat/health, remote configuration, plugin collectors, durable offline queue (SQLite), OTLP telemetry upload, and auto-update **interfaces** — without breaking discovery agents or AI `/agents` APIs.

## 2. Scope

### In

| Area | Deliverable |
|------|-------------|
| Control plane APIs | `/api/v1/ua/*` (register, enroll, heartbeat, inventory, health, config, telemetry, plugins) |
| Data model | Migration **023** |
| Runtime | `@opsedge360/agent-framework` upgrades + `agents/universal-agent` |
| Platforms | Linux, Windows, macOS collectors; extension interfaces for Docker/K8s/cloud/OT |
| Plugins | Loadable collector interface + built-in host metrics/logs plugins |
| Queue | SQLite durable encrypted offline queue |
| Auto-update | Interfaces only (check, verify, rollback, safe restart) — no package distribution |
| UI | `/fleet` Universal Agents dashboard |
| Validation | `P3_WAVE2_VALIDATION_OK` |

### Out

- Full package CDN / signed binary distribution
- Replacing discovery_agents (kept for backward compatibility; UA can link)
- Changing AI Agents `/agents` routes

## 3. Architecture

```text
Universal Agent Runtime
  Identity / Enrollment ──► /ua/enroll | /ua/register
  Scheduler ──► heartbeat, inventory, config, collectors
  Plugins ──► metrics/logs/events
  OTLP Exporter ──► /observability/otlp/*
  Durable SQLite Queue ──► retry/backoff
  Update Manager (interfaces)
        │
        ▼
 API Gateway /api/v1/ua/*  (tenant AuthZ)
        │
        ▼
 Postgres: agents, agent_* (023)
```

## 4. Acceptance criteria

1. Migration 023 applied  
2. Enroll/register + heartbeat + inventory + health work  
3. Config pull applies without restart  
4. OTLP metrics upload from agent path works  
5. Quality/security: agent key required; cross-tenant 404  
6. Fleet UI loads summary + list  
7. Unit/integration tests pass  
8. Production validation green  
