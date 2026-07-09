<!-- Generated Phase 0 — 2026-07-06 — OpsEdge360 -->

# AI Architecture Review

## Components

1. **Python FastAPI** (`ai-agents/`, port 5000) — discovery, RCA, remediation, compliance, fraud, predictive agents
2. **NestJS Copilot** — rule-based fallbacks when agents unavailable
3. **agent_runs** table — persistence

## Maturity: 3.5/10

- AI agent handlers return template summaries
- `orchestrator.py` LLM integration is placeholder
- Copilot uses heuristics for Banking360, RCA, recommendations

## Path forward

- Wire real LLM provider with tenant-scoped keys
- Enforce agent auth (not CORS `*`)
- Add observability for agent latency/cost
