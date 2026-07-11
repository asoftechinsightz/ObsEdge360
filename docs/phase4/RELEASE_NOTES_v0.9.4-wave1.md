# Release Notes — v0.9.4-wave1

**Production SHA:** `75e266257c68e60ed18d80cf89bdc8c321ddf7de`  
**Date:** 2026-07-11

Phase 4 Wave 1 AI foundation: sole LLM Gateway egress, prompt registry, tenant RAG with FTS retrieval, grounded RCA combining Wave 5 evidence + optional LLM, conversational Copilot, multi-signal AIOps correlation, `/aiops` UI, migration **028**. Validated (`P4_WAVE1_VALIDATION_OK`, 15/15).

## Known limitations

- Without `LLM_API_KEY`/`OPENAI_API_KEY`, gateway uses honest **evidence-synthesis-v1** (not a fake foundation model)  
- Embeddings/pgvector deferred; Wave 1 uses PostgreSQL FTS  
- Live remediation execution remains dry-run (Wave 4.4)  
- Full knowledge graph DB is Wave 4.5
