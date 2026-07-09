# OpsEdge360 — AI Agent Architecture

**Version:** 1.0

---

## 1. Overview

OpsEdge360 AI agents are autonomous, policy-governed systems built with **LangGraph**, **MCP (Model Context Protocol)**, and **RAG** over enterprise knowledge (CMDB, runbooks, compliance controls).

## 2. Agent Framework

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                    │
│              (LangGraph State Machine)                   │
└─────────────────────────┬───────────────────────────────┘
                          │
    ┌─────────┬───────────┼───────────┬─────────┐
    ▼         ▼           ▼           ▼         ▼
 Discovery   RCA    Remediation  Compliance  Fraud
  Agent     Agent      Agent       Agent    Agent
    │         │           │           │         │
    └─────────┴───────────┴───────────┴─────────┘
                          │
              ┌───────────▼───────────┐
              │    MCP Tool Layer      │
              │ CMDB │ K8s │ SSH │ API │
              └───────────────────────┘
```

## 3. Agent Definitions

### Discovery Agent
- **Trigger**: `asset.discovered`, scheduled scan completion
- **Goal**: Classify asset type, infer relationships, assign ownership
- **Tools**: CMDB API, Neo4j query, cloud metadata APIs
- **Output**: Enriched CI proposal with `ai_confidence_score`

### RCA Agent
- **Trigger**: `alert.critical`, correlated alert burst
- **Goal**: Identify root cause across IT/network/app/transaction layers
- **Tools**: OpenSearch query, trace lookup, CMDB dependency graph
- **Output**: Hypothesis chain with evidence links, suggested actions

### Remediation Agent
- **Trigger**: Approved remediation request (human-in-the-loop)
- **Goal**: Execute safe automated fixes
- **Tools**: K8s API, SSH, cloud APIs, runbook executor
- **Policy**: Risk tier → auto / approval required / blocked

### Compliance Agent
- **Trigger**: `compliance.violation`, scheduled audit prep
- **Goal**: Map drift to controls, collect evidence, propose fixes
- **Tools**: CMDB, compliance DB, config snapshots
- **Output**: Evidence package, remediation plan

### Fraud Agent
- **Trigger**: Anomaly scores, transaction patterns
- **Goal**: Detect fraud with explainable reasoning
- **Tools**: Transaction API, user behavior baselines, SIEM
- **Output**: Fraud alert with reason codes, affected transactions

## 4. State Machine (LangGraph)

```python
# Simplified agent flow
START → perceive (fetch context) → reason (LLM) → plan (tools)
     → act (execute tools) → reflect (validate) → END
                    ↓ (high risk)
              human_approval → act → END
```

## 5. Human-in-the-Loop

| Risk Tier | Examples | Approval |
|-----------|----------|----------|
| Low | CMDB tag update, documentation | Auto |
| Medium | Service restart, scale pod | Single approver |
| High | Firewall rule change, data deletion | Dual approval |
| Critical | OT command, production DB change | Blocked (manual only) |

## 6. RAG Knowledge Base

| Source | Index | Use |
|--------|-------|-----|
| Runbooks | OpenSearch | Remediation steps |
| Compliance controls | PostgreSQL + vector | Control mapping |
| Historical incidents | OpenSearch | Pattern matching |
| CMDB topology | Neo4j + embeddings | Dependency context |

## 7. MCP Tools

```json
{
  "tools": [
    { "name": "cmdb_get_ci", "description": "Fetch CI by ID" },
    { "name": "cmdb_get_dependencies", "description": "Traversal graph" },
    { "name": "observability_query_logs", "description": "Log search" },
    { "name": "k8s_restart_pod", "description": "Restart pod (approval gated)" },
    { "name": "compliance_get_control", "description": "Framework control detail" }
  ]
}
```

## 8. Observability of Agents

- Every agent run logged with: `agent_id`, `run_id`, `tenant_id`, `trigger`, `tools_used`, `llm_tokens`, `outcome`
- OpenTelemetry spans for each tool invocation
- Dashboard: agent success rate, approval queue depth, MTTR impact

## 9. Implementation

See `ai-agents/` directory:
- `src/orchestrator.py` — LangGraph graphs
- `src/agents/` — Per-agent implementations
- `src/tools/` — MCP tool definitions
- `src/main.py` — FastAPI server
