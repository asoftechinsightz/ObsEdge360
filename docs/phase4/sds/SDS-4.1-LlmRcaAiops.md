# SDS-4.1 — LLM RCA & AIOps Foundation

**Document ID:** OE360-SDS-4.1  
**Wave:** Phase 4 / Wave 1  
**Release:** `v0.9.4`  
**Status:** ✅ CLOSED — production validated (`v0.9.4-wave1`)  
**Depends on:** Phase 3 Wave 6 (`v0.9.3-wave6`), ADR-021/022/023 Accepted  

## Objectives

1. **LLM Gateway** — sole outbound path for chat/complete/embed; OpenAI-compatible providers; usage metering; secret-backed keys  
2. **Prompt registry** — versioned prompts for RCA / Copilot / remediation-suggest  
3. **RAG corpus** — tenant-scoped documents + chunks with full-text retrieval (pgvector optional later)  
4. **Grounded LLM RCA** — assemble evidence from ops-intelligence, topology, CMDB, alerts → LLM or evidence-synthesis → persist session with citations  
5. **Conversational Copilot** — NL queries routed through gateway with tool-grounded context  
6. **AIOps correlation lite** — cross-signal correlation events (metrics/logs/traces/changes hooks)  
7. **Remediation suggestions** — LLM/evidence recommendations feeding dry-run Wave 5 path  

## Non-goals (later waves)

- Autonomous live remediation execution  
- Full knowledge graph DB  
- Multi-provider routing marketplace  
- Fine-tuned domain models  

## Migration

**028** — `llm_prompt_registry`, `llm_usage_events`, `rag_documents`, `rag_chunks`, `llm_rca_sessions`, `aiops_correlation_events`

## Acceptance

**P4_WAVE1_VALIDATION_OK** in production.
