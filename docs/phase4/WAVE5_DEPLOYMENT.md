# Phase 4 Wave 5 — Deployment

1. Deploy via `scripts/vps-deploy-latest.sh`.
2. Migration gate on `kg_entities` applies `032_knowledge_graph_conversations.sql`.
3. Recreate nginx after gateway if needed.
4. Validate: `bash /opt/OpsEdge360/scripts/vps-p4-wave5-validate.sh`
5. Expect: `P4_WAVE5_VALIDATION_OK`
