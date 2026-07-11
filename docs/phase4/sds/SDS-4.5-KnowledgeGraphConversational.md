# SDS-4.5 — Knowledge Graph + Conversational Depth

**Document ID:** OE360-SDS-4.5  
**Wave:** Phase 4 / Wave 5  
**Release:** `v0.9.4`  
**Status:** ✅ CLOSED (`v0.9.4-wave5`)  
**Depends on:** Wave 4 closed (`v0.9.4-wave4`)  
**ADRs:** ADR-021 · ADR-022 · ADR-023  
**Feature SHA:** `b30734fe173448f3484a6a7928c3179b597ab242`  
**Validation:** `P4_WAVE5_VALIDATION_OK` (18/18)

## Objectives

1. Tenant-scoped ops knowledge graph materializing CIs, relationships, incidents, anomalies, forecasts, correlations, remediations.
2. Graph-grounded retrieval for Copilot / RCA (citations with `sourceType: knowledge_graph`).
3. Multi-turn conversational sessions with prior citations retained.
4. Additive `/ai/graph/*` APIs; existing `/ai/*` shapes preserved.
5. Honest LLM gateway labeling unchanged.

## Non-goals

- Neo4j dependency for MVP  
- pgvector hybrid search (future)  
- Replacing CMDB as system of record  

## Migration

**032** — `kg_entities`, `kg_edges`, `kg_sync_runs`, `ai_conversation_sessions`, `ai_conversation_messages`.

## Acceptance

**P4_WAVE5_VALIDATION_OK** in production.
