import { query, queryOne } from '@opsedge360/shared-db';
import * as llm from './llm-gateway.service';
import * as opsIntel from './ops-intelligence.service';

function chunkText(content: string, size = 1200): string[] {
  const chunks: string[] = [];
  const cleaned = content.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];
  for (let i = 0; i < cleaned.length; i += size) {
    chunks.push(cleaned.slice(i, i + size));
  }
  return chunks;
}

export async function ingestDocument(
  tenantId: string,
  input: {
    title: string;
    content: string;
    sourceType?: string;
    sourceRef?: string;
    metadata?: Record<string, unknown>;
  },
) {
  if (!input.title?.trim() || !input.content?.trim()) throw new Error('title and content required');
  const doc = await queryOne<Record<string, unknown>>(
    `INSERT INTO rag_documents (tenant_id, title, source_type, source_ref, content, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      tenantId,
      input.title.trim(),
      input.sourceType ?? 'manual',
      input.sourceRef ?? null,
      input.content,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  const parts = chunkText(input.content);
  for (let i = 0; i < parts.length; i++) {
    await query(
      `INSERT INTO rag_chunks (tenant_id, document_id, chunk_index, content, metadata)
       VALUES ($1,$2,$3,$4,$5)`,
      [tenantId, doc!.id, i, parts[i], JSON.stringify({ title: input.title })],
    );
  }
  return {
    id: doc!.id,
    title: doc!.title,
    chunkCount: parts.length,
    sourceType: doc!.source_type,
  };
}

export async function retrieve(
  tenantId: string,
  q: string,
  limit = 5,
): Promise<Array<{ chunkId: string; documentId: string; title: string; content: string; rank: number }>> {
  if (!q?.trim()) return [];
  const rows = await query<Record<string, unknown>>(
    `SELECT c.id as chunk_id, c.document_id, d.title, c.content,
            ts_rank(c.content_tsv, plainto_tsquery('english', $2)) as rank
     FROM rag_chunks c
     JOIN rag_documents d ON d.id = c.document_id
     WHERE c.tenant_id = $1
       AND c.content_tsv @@ plainto_tsquery('english', $2)
     ORDER BY rank DESC
     LIMIT $3`,
    [tenantId, q.trim(), Math.min(limit, 20)],
  );
  if (rows.length) {
    return rows.map((r) => ({
      chunkId: String(r.chunk_id),
      documentId: String(r.document_id),
      title: String(r.title),
      content: String(r.content),
      rank: Number(r.rank ?? 0),
    }));
  }
  // Fallback ILIKE when FTS returns nothing
  const soft = await query<Record<string, unknown>>(
    `SELECT c.id as chunk_id, c.document_id, d.title, c.content, 0.1 as rank
     FROM rag_chunks c
     JOIN rag_documents d ON d.id = c.document_id
     WHERE c.tenant_id = $1 AND (c.content ILIKE $2 OR d.title ILIKE $2)
     ORDER BY c.created_at DESC
     LIMIT $3`,
    [tenantId, `%${q.trim().slice(0, 80)}%`, Math.min(limit, 20)],
  );
  return soft.map((r) => ({
    chunkId: String(r.chunk_id),
    documentId: String(r.document_id),
    title: String(r.title),
    content: String(r.content),
    rank: Number(r.rank ?? 0),
  }));
}

export async function listDocuments(tenantId: string, limit = 50) {
  return query(
    `SELECT id, title, source_type, source_ref, created_at, updated_at,
            (SELECT COUNT(*) FROM rag_chunks c WHERE c.document_id = d.id) as chunk_count
     FROM rag_documents d
     WHERE tenant_id = $1
     ORDER BY updated_at DESC
     LIMIT $2`,
    [tenantId, Math.min(limit, 200)],
  );
}

/**
 * Assemble platform evidence for grounded RCA / Copilot.
 */
export async function assembleKnowledgeContext(
  tenantId: string,
  opts: { question?: string; incidentId?: string; ciId?: string } = {},
) {
  const health = await opsIntel.getHealth(tenantId);
  const incidents = await opsIntel.listIncidents(tenantId, { status: 'open', limit: 10 });
  const anomalies = await opsIntel.listAnomalies(tenantId, 10);
  const signals = await opsIntel.listSignals(tenantId, 15);
  let incident = null;
  if (opts.incidentId) incident = await opsIntel.getIncident(tenantId, opts.incidentId);

  let blast: unknown = null;
  const ciId = opts.ciId ?? (incident?.primaryCiId as string | undefined);
  if (ciId) {
    try {
      const cmdbUrl = process.env.CMDB_URL ?? 'http://localhost:4002';
      const res = await fetch(`${cmdbUrl}/twin/blast-radius/${ciId}?depth=2&direction=both`, {
        headers: { 'x-tenant-id': tenantId },
      });
      if (res.ok) blast = await res.json();
    } catch {
      /* optional */
    }
  }

  const citations = opts.question ? await retrieve(tenantId, opts.question, 5) : [];

  return {
    health,
    incidents,
    anomalies,
    signals,
    incident,
    blast,
    citations,
    assembledAt: new Date().toISOString(),
  };
}

export async function runGroundedRca(
  tenantId: string,
  opts: {
    question?: string;
    incidentId?: string;
    ciId?: string;
    createdBy?: string;
  },
) {
  const question = opts.question?.trim() || 'Why is the service degraded?';
  // Ensure Wave 5 deterministic evidence also runs
  const classic = await opsIntel.runRca(tenantId, {
    question,
    incidentId: opts.incidentId,
    ciId: opts.ciId,
    createdBy: opts.createdBy,
  });

  const context = await assembleKnowledgeContext(tenantId, {
    question,
    incidentId: opts.incidentId,
    ciId: opts.ciId,
  });

  const prompt = await llm.getActivePrompt('rca', tenantId);
  const system =
    (prompt?.system_prompt as string) ||
    'You are OpsEdge360 RCA assistant. Use only provided evidence.';
  const userTemplate =
    (prompt?.user_template as string) ||
    'Question: {{question}}\n\nEvidence JSON:\n{{evidence}}\n\nRAG citations:\n{{citations}}';
  const user = llm.renderTemplate(userTemplate, {
    question,
    evidence: JSON.stringify(
      {
        classicSummary: classic.summary,
        classicHypotheses: classic.hypotheses,
        health: context.health,
        openIncidents: context.incidents,
        anomalies: context.anomalies,
        blast: context.blast,
        incident: context.incident,
      },
      null,
      2,
    ),
    citations: JSON.stringify(
      context.citations.map((c) => ({ title: c.title, excerpt: c.content.slice(0, 400), rank: c.rank })),
      null,
      2,
    ),
  });

  const completion = await llm.completeChat(tenantId, 'rca', [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);

  const remediationSuggestions = [
    {
      action: 'Review blast radius and confirm primary CI',
      riskTier: 'low',
      executionMode: 'dry_run',
    },
    {
      action: 'Request Ops Intelligence dry-run remediation after confirmation',
      riskTier: 'medium',
      executionMode: 'dry_run',
    },
  ];

  const confidencePct = Math.max(
    Number(classic.confidencePct ?? 0),
    completion.mode === 'llm' ? 70 : Number(classic.confidencePct ?? 0),
  );

  const session = await queryOne<Record<string, unknown>>(
    `INSERT INTO llm_rca_sessions
      (tenant_id, question, incident_id, ci_id, evidence, rag_citations, model, provider,
       summary, hypotheses, remediation_suggestions, confidence_pct, prompt_tokens, completion_tokens, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      tenantId,
      question,
      opts.incidentId ?? null,
      opts.ciId ?? null,
      JSON.stringify({ classic, context }),
      JSON.stringify(context.citations),
      completion.model,
      completion.provider,
      completion.content,
      JSON.stringify(classic.hypotheses ?? []),
      JSON.stringify(remediationSuggestions),
      confidencePct,
      completion.promptTokens,
      completion.completionTokens,
      opts.createdBy ?? null,
    ],
  );

  return {
    id: session!.id,
    question,
    summary: completion.content,
    model: completion.model,
    provider: completion.provider,
    mode: completion.mode,
    confidencePct,
    citations: context.citations,
    hypotheses: classic.hypotheses,
    remediationSuggestions,
    classicRcaId: classic.id,
    createdAt: session!.created_at,
  };
}

export async function getLlmRca(tenantId: string, id: string) {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM llm_rca_sessions WHERE tenant_id = $1 AND id = $2`,
    [tenantId, id],
  );
  if (!row) return null;
  return {
    id: row.id,
    question: row.question,
    summary: row.summary,
    model: row.model,
    provider: row.provider,
    confidencePct: row.confidence_pct,
    citations: row.rag_citations,
    hypotheses: row.hypotheses,
    remediationSuggestions: row.remediation_suggestions,
    evidence: row.evidence,
    createdAt: row.created_at,
  };
}

export async function listLlmRca(tenantId: string, limit = 20) {
  return query(
    `SELECT id, question, model, provider, confidence_pct, created_at
     FROM llm_rca_sessions WHERE tenant_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [tenantId, Math.min(limit, 100)],
  );
}

export async function copilotAnswer(tenantId: string, question: string) {
  const context = await assembleKnowledgeContext(tenantId, { question });
  const prompt = await llm.getActivePrompt('copilot', tenantId);
  const system =
    (prompt?.system_prompt as string) ||
    'You are OpsEdge360 operations Copilot. Use only provided context.';
  const userTemplate =
    (prompt?.user_template as string) ||
    'User question: {{question}}\n\nPlatform context:\n{{context}}\n\nRAG:\n{{citations}}';
  const user = llm.renderTemplate(userTemplate, {
    question,
    context: JSON.stringify(
      {
        health: context.health,
        openIncidents: context.incidents.slice(0, 5),
        anomalies: context.anomalies.slice(0, 5),
        blast: context.blast,
      },
      null,
      2,
    ),
    citations: JSON.stringify(
      context.citations.map((c) => ({ title: c.title, excerpt: c.content.slice(0, 300) })),
    ),
  });
  const completion = await llm.completeChat(tenantId, 'copilot', [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  return {
    reply: completion.content,
    model: completion.model,
    provider: completion.provider,
    mode: completion.mode,
    citations: context.citations,
    sources: ['ops-intelligence', 'rag', 'llm-gateway'],
  };
}

/**
 * Cross-signal correlation lite: group open incidents + anomalies + recent alert titles.
 */
export async function correlateAdvanced(tenantId: string) {
  const incidents = await opsIntel.listIncidents(tenantId, { status: 'open', limit: 20 });
  const anomalies = await opsIntel.listAnomalies(tenantId, 20);
  const signals = {
    incidents: incidents.length,
    anomalies: anomalies.length,
    metrics: anomalies.filter((a: Record<string, unknown>) => a.anomaly_type === 'metric_deviation').length,
  };
  const title =
    incidents[0]?.title ||
    (anomalies[0] as Record<string, unknown> | undefined)?.metric_name ||
    'Multi-signal correlation window';
  const severity =
    incidents.some((i) => i.severity === 'critical') ||
    anomalies.some((a: Record<string, unknown>) => a.severity === 'critical')
      ? 'critical'
      : incidents.length || anomalies.length
        ? 'warning'
        : 'info';
  const corrKey = `aiops:${new Date().toISOString().slice(0, 13)}`;
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM aiops_correlation_events
     WHERE tenant_id = $1 AND correlation_key = $2 AND status = 'open' LIMIT 1`,
    [tenantId, corrKey],
  );
  if (existing) {
    return { id: existing.id, created: false, signals, title, severity };
  }
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO aiops_correlation_events
      (tenant_id, correlation_key, title, severity, signals, related_incident_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,'open')
     RETURNING *`,
    [
      tenantId,
      corrKey,
      String(title).slice(0, 500),
      severity,
      JSON.stringify(signals),
      incidents[0]?.id ?? null,
    ],
  );
  return {
    id: row!.id,
    created: true,
    title: row!.title,
    severity: row!.severity,
    signals,
  };
}

export async function listCorrelations(tenantId: string, limit = 50) {
  return query(
    `SELECT * FROM aiops_correlation_events WHERE tenant_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [tenantId, Math.min(limit, 200)],
  );
}
