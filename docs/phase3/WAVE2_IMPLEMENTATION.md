# Phase 3 Wave 2 — Implementation

**SDS:** [SDS-3.2-UniversalAgent.md](./sds/SDS-3.2-UniversalAgent.md)

## Components

| Layer | Path |
|-------|------|
| Migration | `database/migrations/023_universal_agent.sql` |
| Control plane | `apps/api-gateway/src/ua/*` |
| Framework | `packages/agent-framework` (durable queue, scheduler, plugins, UniversalAgent) |
| Runtime | `agents/universal-agent` |
| UI | `apps/web/src/app/fleet` |

## Architecture

```text
Universal Agent ──enroll/heartbeat/inventory/OTLP──► Gateway /api/v1/ua/*
                                                      │
                                                      ├─ agents / agent_* (023)
                                                      └─ observability /v1/* (OTLP)
Fleet UI /fleet ──JWT──► /ua/summary|/ua/agents|bootstrap-tokens
```
