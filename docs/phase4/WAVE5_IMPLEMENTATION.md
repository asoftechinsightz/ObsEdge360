# Phase 4 Wave 5 — Implementation

See [SDS-4.5-KnowledgeGraphConversational.md](./sds/SDS-4.5-KnowledgeGraphConversational.md).

- Engine: `services/observability/src/knowledge-graph.service.ts`
- Context: graph citations in `aiops.service.ts` `assembleKnowledgeContext` / Copilot multi-turn
- Routes: `/ai/graph/sync|stats|neighborhood`, `/ai/conversations`
- UI: `/aiops` — Sync KG, Neighborhood, session-aware Copilot
- Migration: `032_knowledge_graph_conversations.sql`
