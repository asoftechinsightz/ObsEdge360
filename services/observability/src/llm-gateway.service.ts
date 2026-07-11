import { query, queryOne } from '@opsedge360/shared-db';

export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompleteResult {
  content: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  mode: 'llm' | 'evidence-synthesis';
}

function getProviderConfig() {
  const apiKey =
    process.env.LLM_API_KEY ||
    process.env.OPENAI_API_KEY ||
    '';
  const baseUrl = (process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(
    /\/$/,
    '',
  );
  const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const provider = process.env.LLM_PROVIDER || (apiKey ? 'openai-compatible' : 'evidence-synthesis');
  return { apiKey, baseUrl, model, provider };
}

export function llmGatewayStatus() {
  const cfg = getProviderConfig();
  return {
    configured: Boolean(cfg.apiKey),
    provider: cfg.provider,
    model: cfg.model,
    baseUrl: cfg.apiKey ? cfg.baseUrl : null,
    fallback: 'evidence-synthesis-v1',
  };
}

async function recordUsage(
  tenantId: string,
  purpose: string,
  result: Pick<LlmCompleteResult, 'provider' | 'model' | 'promptTokens' | 'completionTokens' | 'latencyMs'> & {
    status?: string;
    errorCode?: string;
  },
  requestId?: string,
) {
  await query(
    `INSERT INTO llm_usage_events
      (tenant_id, purpose, provider, model, prompt_tokens, completion_tokens, latency_ms, status, error_code, request_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      tenantId,
      purpose,
      result.provider,
      result.model,
      result.promptTokens,
      result.completionTokens,
      result.latencyMs,
      result.status ?? 'ok',
      result.errorCode ?? null,
      requestId ?? null,
    ],
  );
}

function evidenceSynthesis(messages: LlmChatMessage[]): LlmCompleteResult {
  const user = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const system = messages.find((m) => m.role === 'system')?.content ?? '';
  // Extract evidence block if present
  const evidenceMatch = user.match(/Evidence JSON:\n([\s\S]*?)(?:\n\nRAG citations:|$)/);
  let summary =
    'Evidence-synthesis mode (no LLM API key configured). Analysis is grounded on provided platform evidence only.';
  const hypotheses: string[] = [];
  try {
    if (evidenceMatch) {
      const evidence = JSON.parse(evidenceMatch[1]);
      const alerts = evidence.recentAlerts?.length ?? evidence.alerts?.length ?? 0;
      const anomalies = evidence.recentAnomalies?.length ?? evidence.anomalies?.length ?? 0;
      const blast = evidence.blast?.affectedCis ?? evidence.blastSummary?.affectedCis;
      if (anomalies > 0) {
        hypotheses.push(`Metric anomalies detected (${anomalies}) — investigate top σ deviations first. (confidence ~70%)`);
      }
      if (alerts > 0) {
        hypotheses.push(`Active alerts (${alerts}) suggest correlated service pressure. (confidence ~65%)`);
      }
      if (blast) {
        hypotheses.push(`Blast radius indicates ${blast} dependent CIs — prioritize primary CI recovery. (confidence ~75%)`);
      }
      if (!hypotheses.length) {
        hypotheses.push('Insufficient signal for confident root cause — ingest more telemetry or select a CI. (confidence 0%)');
      }
      summary = [
        summary,
        '',
        'Summary:',
        hypotheses[0],
        '',
        'Hypotheses:',
        ...hypotheses.map((h, i) => `${i + 1}. ${h}`),
        '',
        'Remediation suggestions (dry-run):',
        '- Open Ops Intelligence RCA and Topology blast-radius for the primary CI.',
        '- Request dry-run remediation from Ops Intelligence after confirming the CI.',
      ].join('\n');
    } else {
      summary = `${summary}\n\nContext received (${user.length} chars). ${system.slice(0, 200)}`;
    }
  } catch {
    summary = `${summary}\n\nCould not parse evidence JSON; returning safe insufficient-signal response.`;
  }
  return {
    content: summary,
    provider: 'evidence-synthesis',
    model: 'evidence-synthesis-v1',
    promptTokens: Math.ceil(user.length / 4),
    completionTokens: Math.ceil(summary.length / 4),
    latencyMs: 0,
    mode: 'evidence-synthesis',
  };
}

export async function completeChat(
  tenantId: string,
  purpose: string,
  messages: LlmChatMessage[],
  opts: { model?: string; temperature?: number; requestId?: string } = {},
): Promise<LlmCompleteResult> {
  const cfg = getProviderConfig();
  const started = Date.now();

  if (!cfg.apiKey) {
    const result = evidenceSynthesis(messages);
    result.latencyMs = Date.now() - started;
    await recordUsage(tenantId, purpose, result, opts.requestId);
    return result;
  }

  const model = opts.model || cfg.model;
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: opts.temperature ?? 0.2,
        messages,
      }),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      await recordUsage(
        tenantId,
        purpose,
        {
          provider: cfg.provider,
          model,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs,
          status: 'error',
          errorCode: `http_${res.status}`,
        },
        opts.requestId,
      );
      // Fall back to evidence synthesis rather than failing the operator workflow
      const fallback = evidenceSynthesis(messages);
      fallback.latencyMs = latencyMs;
      fallback.content = `${fallback.content}\n\n(LLM provider error ${res.status}; used evidence-synthesis fallback. ${text.slice(0, 120)})`;
      await recordUsage(tenantId, purpose, { ...fallback, status: 'fallback' }, opts.requestId);
      return fallback;
    }
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = body.choices?.[0]?.message?.content ?? '';
    const result: LlmCompleteResult = {
      content,
      provider: cfg.provider,
      model,
      promptTokens: Number(body.usage?.prompt_tokens ?? 0),
      completionTokens: Number(body.usage?.completion_tokens ?? 0),
      latencyMs,
      mode: 'llm',
    };
    await recordUsage(tenantId, purpose, result, opts.requestId);
    return result;
  } catch (err) {
    const latencyMs = Date.now() - started;
    await recordUsage(
      tenantId,
      purpose,
      {
        provider: cfg.provider,
        model,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs,
        status: 'error',
        errorCode: 'network',
      },
      opts.requestId,
    );
    const fallback = evidenceSynthesis(messages);
    fallback.latencyMs = latencyMs;
    fallback.content = `${fallback.content}\n\n(LLM unreachable: ${(err as Error).message}; evidence-synthesis fallback.)`;
    await recordUsage(tenantId, purpose, { ...fallback, status: 'fallback' }, opts.requestId);
    return fallback;
  }
}

export async function getActivePrompt(purpose: string, tenantId?: string) {
  const tenantPrompt = tenantId
    ? await queryOne<Record<string, unknown>>(
        `SELECT * FROM llm_prompt_registry
         WHERE purpose = $1 AND active = true AND tenant_id = $2
         ORDER BY version DESC LIMIT 1`,
        [purpose, tenantId],
      )
    : null;
  if (tenantPrompt) return tenantPrompt;
  return queryOne<Record<string, unknown>>(
    `SELECT * FROM llm_prompt_registry
     WHERE purpose = $1 AND active = true AND tenant_id IS NULL
     ORDER BY version DESC LIMIT 1`,
    [purpose],
  );
}

export function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}
