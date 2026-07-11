-- 028_llm_aiops_foundation.sql
-- Phase 4 Wave 1 — LLM Gateway, RAG, grounded RCA, AIOps correlation

CREATE TABLE IF NOT EXISTS llm_prompt_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  purpose VARCHAR(64) NOT NULL,
  system_prompt TEXT NOT NULL,
  user_template TEXT NOT NULL,
  model_hint VARCHAR(128),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name, version)
);

CREATE INDEX IF NOT EXISTS idx_llm_prompt_purpose
  ON llm_prompt_registry (purpose, active);

CREATE TABLE IF NOT EXISTS llm_usage_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purpose VARCHAR(64) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  model VARCHAR(128) NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  latency_ms INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'ok',
  error_code VARCHAR(64),
  request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_tenant
  ON llm_usage_events (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  source_type VARCHAR(64) NOT NULL DEFAULT 'manual',
  source_ref VARCHAR(255),
  sensitivity VARCHAR(32) NOT NULL DEFAULT 'internal',
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_docs_tenant
  ON rag_documents (tenant_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_tenant_tsv
  ON rag_chunks USING GIN (content_tsv);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_tenant_doc
  ON rag_chunks (tenant_id, document_id);

CREATE TABLE IF NOT EXISTS llm_rca_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  incident_id UUID,
  ci_id UUID,
  evidence JSONB NOT NULL DEFAULT '{}',
  rag_citations JSONB NOT NULL DEFAULT '[]',
  model VARCHAR(128) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  summary TEXT,
  hypotheses JSONB NOT NULL DEFAULT '[]',
  remediation_suggestions JSONB NOT NULL DEFAULT '[]',
  confidence_pct SMALLINT NOT NULL DEFAULT 0,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_rca_tenant
  ON llm_rca_sessions (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS aiops_correlation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  correlation_key VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  signals JSONB NOT NULL DEFAULT '{}',
  related_incident_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aiops_corr_tenant
  ON aiops_correlation_events (tenant_id, status, created_at DESC);

-- Platform-default prompts (tenant_id NULL = global)
INSERT INTO llm_prompt_registry (tenant_id, name, version, purpose, system_prompt, user_template, model_hint, active)
SELECT NULL, 'rca_grounded', 1, 'rca',
  'You are OpsEdge360 RCA assistant. Use ONLY the provided evidence and RAG citations. Do not invent assets, metrics, or incidents. If evidence is insufficient, say so. Return concise hypotheses with confidence and cited sources.',
  'Question: {{question}}\n\nEvidence JSON:\n{{evidence}}\n\nRAG citations:\n{{citations}}\n\nRespond with: summary, ranked hypotheses (confidence %), and remediation suggestions (dry-run safe).',
  'gpt-4o-mini', true
WHERE NOT EXISTS (SELECT 1 FROM llm_prompt_registry WHERE name = 'rca_grounded' AND version = 1 AND tenant_id IS NULL);

INSERT INTO llm_prompt_registry (tenant_id, name, version, purpose, system_prompt, user_template, model_hint, active)
SELECT NULL, 'copilot_chat', 1, 'copilot',
  'You are OpsEdge360 operations Copilot. Answer using provided platform context only. Prefer actionable next steps. Never claim you executed remediation.',
  'User question: {{question}}\n\nPlatform context:\n{{context}}\n\nRAG:\n{{citations}}',
  'gpt-4o-mini', true
WHERE NOT EXISTS (SELECT 1 FROM llm_prompt_registry WHERE name = 'copilot_chat' AND version = 1 AND tenant_id IS NULL);
