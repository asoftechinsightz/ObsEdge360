# ADR-023: RAG Architecture

**Status:** Accepted (Phase 4 Wave 1 scope)  
**Date:** 2026-07-10  
**Accepted:** 2026-07-11 — tenant-scoped corpus with FTS retrieval; embeddings via gateway when configured.  
**Deciders:** Chief Architect, Security Architect  
**Phase:** 4  
**Depends on:** ADR-021, ADR-022, ADR-011  

---

## Context

Copilot and RCA need retrieval-augmented generation over runbooks, CMDB, incidents, and docs — with strict tenant boundaries.

## Decision

1. **RAG pipeline:** ingest → chunk → embed (via LLM Gateway) → index → retrieve → ground prompt.  
2. Phase 4 may start with PostgreSQL + pgvector or equivalent; OpenSearch optional in Phase 6.  
3. Every chunk tagged with `tenant_id` (+ optional pack/sensitivity).  
4. Retrieval filters by tenant before prompt assembly.  
5. Cite sources in Copilot responses where feasible.  
6. Human-readable runbooks and selected CMDB/incident summaries are primary corpora initially.

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| Unbounded web browse as RAG | Unreliable + data leakage |
| Single global corpus | Breaks tenancy |
| Fine-tune only, no RAG | Stale + expensive |

## Consequences

**Positive:** Grounded answers; auditable sources.  
**Negative:** Index freshness and embedding cost.

## Compliance

- No embedding of secrets or raw credentials.  
- Cross-tenant retrieval tests mandatory.  
