# Phase 4 — Implementation Waves

**Release:** `v0.9.4` AI & Agentic AI Foundation  
**Strategy:** Deliver by capability workstream, one wave at a time.  
**Cadence:** SDS → implement → test → VPS deploy → validate → docs/tag → EAB closure → next wave.  
**Depends on:** Phase 3 closed (`v0.9.3-wave6`)  
**ADRs:** ADR-021 Copilot · ADR-022 LLM Gateway · ADR-023 RAG — **Accepted for Wave 1 scope**

| Wave | WBS | Focus | SDS |
|------|-----|-------|-----|
| 1 | 4.1 | LLM Gateway, Grounded RCA, RAG corpus, Copilot NL | [SDS-4.1-LlmRcaAiops.md](./sds/SDS-4.1-LlmRcaAiops.md) — **Closed** (`v0.9.4-wave1`) |
| 2 | 4.2 | Advanced multi-signal correlation | Planned — next after Wave 1 EAB |
| 3 | 4.3 | Predictive anomaly + capacity forecasting | Planned |
| 4 | 4.4 | Intelligent remediation (controlled execution) | Planned |
| 5 | 4.5 | Knowledge graph + conversational depth | Planned |

## Engineering rules (binding)

1. All LLM egress via LLM Gateway only (ADR-022).  
2. Answers must be grounded (RAG + tool evidence); no ungrounded free-form production claims.  
3. Tenant isolation on prompts, RAG chunks, and sessions.  
4. No high-risk remediation without human approval.  
5. Honest model labeling when using evidence-synthesis fallback (no fake “GPT” claims).  
6. Production validation required before wave closure.

## EAB (2026-07-11)

Phase 3 Core Observability complete. Phase 4 authorized to differentiate via AI-native ops intelligence.
