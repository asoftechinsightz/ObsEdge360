-- 032_knowledge_graph_conversations.sql
-- Phase 4 Wave 5 — Ops knowledge graph + conversational depth

CREATE TABLE IF NOT EXISTS kg_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(40) NOT NULL,
  source_table VARCHAR(80) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  label VARCHAR(500) NOT NULL,
  attrs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_kg_entities_tenant_type
  ON kg_entities (tenant_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_kg_entities_label
  ON kg_entities (tenant_id, lower(label));

CREATE TABLE IF NOT EXISTS kg_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_entity_id UUID NOT NULL REFERENCES kg_entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES kg_entities(id) ON DELETE CASCADE,
  edge_type VARCHAR(80) NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 1,
  evidence JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, from_entity_id, to_entity_id, edge_type)
);

CREATE INDEX IF NOT EXISTS idx_kg_edges_from
  ON kg_edges (tenant_id, from_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_to
  ON kg_edges (tenant_id, to_entity_id);

CREATE TABLE IF NOT EXISTS kg_sync_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entities_upserted INT NOT NULL DEFAULT 0,
  edges_upserted INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  summary JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kg_sync_tenant
  ON kg_sync_runs (tenant_id, started_at DESC);

CREATE TABLE IF NOT EXISTS ai_conversation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_by VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_tenant
  ON ai_conversation_sessions (tenant_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES ai_conversation_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]',
  model VARCHAR(100),
  provider VARCHAR(50),
  mode VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_msgs
  ON ai_conversation_messages (tenant_id, session_id, created_at);
