import { Injectable } from '@nestjs/common';
import { ProxyService } from '../proxy.service';

export interface CopilotMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  actionHref?: string;
  confidence: number;
}

@Injectable()
export class CopilotService {
  constructor(private proxy: ProxyService) {}

  async chat(tenantId: string, messages: CopilotMessage[], userId?: string): Promise<{
    reply: string;
    recommendations: Recommendation[];
    agentRun?: unknown;
    sources: string[];
    model?: string;
    mode?: string;
    structured: {
      confirmed: string[];
      correlations: string[];
      recommendations: string[];
      disclaimer: string;
    };
    sessionId?: string;
  }> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const prompt = (lastUser?.content ?? '').toLowerCase();
    const sources: string[] = [];
    const wrap = async (base: {
      reply: string;
      recommendations: Recommendation[];
      agentRun?: unknown;
      sources: string[];
      model?: string;
      mode?: string;
    }) => {
      const structured = this.structureReply(base.reply, base.recommendations, base.sources);
      let sessionId: string | undefined;
      try {
        if (userId && tenantId) {
          const session = await this.ensureSession(tenantId, userId, lastUser?.content);
          sessionId = session?.id;
          if (sessionId) {
            await this.persistMessage(sessionId, tenantId, 'user', lastUser?.content ?? '', {});
            await this.persistMessage(sessionId, tenantId, 'assistant', base.reply, structured, base.sources);
          }
        }
      } catch {
        /* persistence optional */
      }
      return { ...base, structured, sessionId };
    };

    // Phase 4: prefer grounded AI Copilot / RCA via LLM gateway
    if (this.matches(prompt, ['rca', 'root cause', 'why is', 'what caused', 'incident', 'outage', 'latency spike', 'blast radius', 'degraded'])) {
      const grounded = await this.safeJson(
        this.proxy.observability('/ai/rca', {
          method: 'POST',
          tenantId,
          body: { question: lastUser?.content ?? '' },
        }),
      );
      if (grounded?.summary) {
        sources.push('llm-rca', 'rag', 'ops-intelligence', 'topology');
        return wrap({
          reply: grounded.summary,
          recommendations: await this.getRecommendations(tenantId),
          sources,
          model: grounded.model,
          mode: grounded.mode,
        });
      }
      const rca = await this.runRca(tenantId, { question: lastUser?.content ?? '' });
      sources.push('rca', 'observability', 'cmdb');
      return wrap({
        reply: rca.summary,
        recommendations: rca.recommendations,
        agentRun: rca.agentRun,
        sources,
      });
    }

    // Explain alerts / summarize
    if (this.matches(prompt, ['explain alert', 'summarize alert', 'what does this alert', 'alert mean'])) {
      const alerts = await this.safeJson(this.proxy.observability('/alert-events', { tenantId }));
      const recent = (alerts?.events ?? []).slice(0, 5);
      sources.push('alert-events');
      const confirmed = recent.map((a: { title?: string; severity?: string }) => `${a.severity ?? 'info'}: ${a.title ?? 'alert'}`);
      return wrap({
        reply: confirmed.length
          ? `Recent alerts (confirmed from alert_events):\n${confirmed.map((c: string) => `- ${c}`).join('\n')}\n\nRecommendation: triage high/critical first; correlate with synthetics and topology before remediating.`
          : 'No recent alert events found for this tenant. Confirmed empty result — not an absence of risk elsewhere.',
        recommendations: await this.getRecommendations(tenantId),
        sources,
      });
    }

    if (this.matches(prompt, ['executive summary', 'ops summary', 'health summary', 'status summary'])) {
      const overview = await this.buildOverview(tenantId);
      sources.push('overview', 'executive');
      return wrap({
        reply: `Executive operational summary (confirmed telemetry snapshot):\n${overview}\n\nCorrelations should be validated in Ops Intelligence before change windows.`,
        recommendations: await this.getRecommendations(tenantId),
        sources,
      });
    }

    // General NL via Phase 4 Copilot
    if (lastUser?.content) {
      const ai = await this.safeJson(
        this.proxy.observability('/ai/copilot', {
          method: 'POST',
          tenantId,
          body: { question: lastUser.content },
        }),
      );
      if (ai?.reply) {
        sources.push(...(ai.sources ?? ['ai-copilot']));
        return wrap({
          reply: ai.reply,
          recommendations: await this.getRecommendations(tenantId),
          sources,
          model: ai.model,
          mode: ai.mode,
        });
      }
    }

    if (this.matches(prompt, ['recommend', 'suggestion', 'what should', 'improve', 'optimize', 'next step', 'runbook'])) {
      const recs = await this.getRecommendations(tenantId);
      sources.push('recommendations');
      return wrap({
        reply: this.formatRecommendationsReply(recs),
        recommendations: recs,
        sources,
      });
    }

    if (this.matches(prompt, ['compliance', 'rbi', 'pci', 'banking', 'control'])) {
      const banking = await this.safeJson(this.proxy.compliance('/banking360', { tenantId }));
      sources.push('banking360', 'compliance');
      const enabled = banking?.enabled ? 'active' : 'inactive';
      const score = banking?.bankingScore ?? 0;
      return wrap({
        reply: `Banking360 is ${enabled}. Combined RBI/PCI score is ${score}%. RBI: ${banking?.frameworks?.rbi?.score ?? 0}%, PCI: ${banking?.frameworks?.pci?.score ?? 0}%. ${score < 80 ? 'Run validation and remediate failed controls.' : 'Compliance posture looks healthy.'}`,
        recommendations: await this.getRecommendations(tenantId),
        sources,
      });
    }

    if (this.matches(prompt, ['transaction', 'upi', 'slo', 'payment'])) {
      const slos = await this.safeJson(this.proxy.transactions('/transactions/slos', { tenantId }));
      sources.push('transactions');
      return wrap({
        reply: `Payment/transaction SLOs: ${slos?.met ?? 0}/${slos?.totalSlos ?? 0} met (${slos?.compliancePct ?? 0}% compliance). ${slos?.breached ? `${slos.breached} breached — review latency on /transactions.` : 'All tracked SLOs are within target.'}`,
        recommendations: await this.getRecommendations(tenantId),
        sources,
      });
    }

    // Default: overview + try agent
    const overview = await this.buildOverview(tenantId);
    sources.push('overview');
    let agentRun: unknown;
    try {
      const agent = await this.proxy.aiAgents('/api/v1/agents/run', {
        method: 'POST',
        body: {
          agent_type: 'rca',
          tenant_id: tenantId,
          trigger: 'copilot.chat',
          context: { question: lastUser?.content, overview },
        },
      });
      if (agent.status < 400) {
        agentRun = agent.data;
        sources.push('ai-agents');
      }
    } catch {
      // agents optional
    }

    const recs = await this.getRecommendations(tenantId);
    return wrap({
      reply: `${overview}\n\nAsk me about RCA, alert explanations, executive summaries, recommendations, compliance, or payment SLOs.`,
      recommendations: recs.slice(0, 3),
      agentRun,
      sources,
    });
  }

  private structureReply(reply: string, recommendations: Recommendation[], sources: string[]) {
    return {
      confirmed: sources.length ? [`Sources consulted: ${sources.join(', ')}`] : [],
      correlations: sources.includes('llm-rca') || sources.includes('rca') ? ['RCA path used — treat links as correlations until verified'] : [],
      recommendations: recommendations.slice(0, 5).map((r) => `${r.title}: ${r.description}`),
      disclaimer: 'Confirmed findings come from live APIs/DB. Correlations and recommendations are advisory — do not treat as automatic remediation approval.',
      replyPreview: reply.slice(0, 280),
    };
  }

  private async ensureSession(tenantId: string, userId: string, title?: string) {
    const { queryOne } = await import('@opsedge360/shared-db');
    return queryOne(
      `INSERT INTO copilot_sessions (tenant_id, user_id, title)
       SELECT t.id, $2, $3 FROM tenants t
       WHERE t.id::text = $1 OR t.slug = $1
       RETURNING id`,
      [tenantId, userId, (title || 'Copilot session').slice(0, 120)],
    );
  }

  private async persistMessage(
    sessionId: string,
    tenantId: string,
    role: string,
    content: string,
    structured: Record<string, unknown>,
    sources: string[] = [],
  ) {
    const { query } = await import('@opsedge360/shared-db');
    await query(
      `INSERT INTO copilot_messages (session_id, tenant_id, role, content, structured, sources)
       SELECT $1, t.id, $3, $4, $5::jsonb, $6 FROM tenants t
       WHERE t.id::text = $2 OR t.slug = $2`,
      [sessionId, tenantId, role, content, JSON.stringify(structured), sources],
    );
  }

  async runRca(tenantId: string, context: { question?: string; ciName?: string } = {}) {
    const evidence: string[] = [];
    const recommendations: Recommendation[] = [];

    const hosts = await this.safeJson(this.proxy.observability('/hosts', { tenantId }));
    const hotHosts = (hosts?.hosts ?? []).filter(
      (h: { cpuPct: number; memoryPct: number; diskPct: number }) =>
        h.cpuPct >= 80 || h.memoryPct >= 85 || h.diskPct >= 90,
    );
    for (const h of hotHosts.slice(0, 3)) {
      evidence.push(
        `Host ${h.hostname}: CPU ${h.cpuPct}%, mem ${h.memoryPct}%, disk ${h.diskPct}%`,
      );
      recommendations.push({
        id: `host-${h.hostname}`,
        category: 'infrastructure',
        title: `Investigate ${h.hostname}`,
        description: `Resource pressure detected (CPU ${h.cpuPct}%, memory ${h.memoryPct}%).`,
        priority: h.cpuPct >= 90 || h.memoryPct >= 90 ? 'critical' : 'high',
        source: 'host-metrics',
        actionHref: '/observability',
        confidence: 82,
      });
    }

    const alerts = await this.safeJson(this.proxy.observability('/alert-events', { tenantId }));
    const recentAlerts = (alerts?.events ?? []).slice(0, 5);
    for (const a of recentAlerts) {
      evidence.push(`Alert: ${a.title} (${a.severity})`);
    }

    const slos = await this.safeJson(this.proxy.transactions('/transactions/slos', { tenantId }));
    const breached = (slos?.slos ?? []).filter((s: { compliant: boolean }) => !s.compliant);
    for (const s of breached.slice(0, 3)) {
      evidence.push(`SLO breach: ${s.name} current ${s.currentValue}ms > target ${s.targetValue}ms`);
      recommendations.push({
        id: `slo-${s.id}`,
        category: 'transactions',
        title: `Remediate ${s.transactionName} latency`,
        description: `${s.metric} is ${s.currentValue}ms against ${s.targetValue}ms target.`,
        priority: 'high',
        source: 'transaction-slos',
        actionHref: '/transactions',
        confidence: 88,
      });
    }

    // Try LangGraph-style agent
    let agentRun: unknown;
    try {
      const agent = await this.proxy.aiAgents('/api/v1/agents/run', {
        method: 'POST',
        body: {
          agent_type: 'rca',
          tenant_id: tenantId,
          trigger: 'copilot.rca',
          context: {
            question: context.question,
            ciName: context.ciName,
            evidence,
          },
        },
      });
      if (agent.status < 400) agentRun = agent.data;
    } catch {
      // optional
    }

    const agentSummary =
      agentRun && typeof agentRun === 'object' && 'summary' in agentRun
        ? String((agentRun as { summary: string }).summary)
        : null;

    const summary =
      agentSummary ??
      (evidence.length
        ? `RCA findings (${evidence.length} signals):\n${evidence.map((e) => `• ${e}`).join('\n')}\n\nLikely contributors: ${hotHosts.length ? 'host resource pressure' : 'no hot hosts'}; ${breached.length ? 'transaction SLO breaches' : 'SLOs within target'}; ${recentAlerts.length ? 'recent alert activity' : 'no recent alerts'}.`
        : 'No strong incident signals in the last window. Systems appear stable. Try a more specific question (service name, transaction, or alert).');

    if (!recommendations.length) {
      recommendations.push({
        id: 'baseline',
        category: 'ops',
        title: 'Continue monitoring',
        description: 'No critical RCA signals. Keep scrape targets and alert rules active.',
        priority: 'low',
        source: 'copilot',
        actionHref: '/observability',
        confidence: 70,
      });
    }

    return { summary, evidence, recommendations, agentRun };
  }

  async getRecommendations(tenantId: string): Promise<Recommendation[]> {
    const recs: Recommendation[] = [];

    const targets = await this.safeJson(this.proxy.observability('/scrape-targets', { tenantId }));
    if ((targets?.targets ?? []).length === 0) {
      recs.push({
        id: 'scrape-missing',
        category: 'observability',
        title: 'Add Prometheus scrape targets',
        description: 'No scrape targets configured. Host metrics and alert evaluation need targets.',
        priority: 'medium',
        source: 'infra',
        actionHref: '/observability',
        confidence: 90,
      });
    }

    const banking = await this.safeJson(this.proxy.compliance('/banking360', { tenantId }));
    if (banking && !banking.enabled) {
      recs.push({
        id: 'banking-activate',
        category: 'compliance',
        title: 'Activate Banking360',
        description: 'BFSI pack is inactive. Enable RBI/PCI controls for regulated workloads.',
        priority: 'medium',
        source: 'banking360',
        actionHref: '/banking360',
        confidence: 85,
      });
    } else if (banking?.enabled && (banking.bankingScore ?? 100) < 80) {
      recs.push({
        id: 'banking-score',
        category: 'compliance',
        title: 'Improve Banking360 compliance score',
        description: `Current score ${banking.bankingScore}%. Review failed RBI/PCI controls.`,
        priority: 'high',
        source: 'banking360',
        actionHref: '/banking360',
        confidence: 86,
      });
    }

    const hosts = await this.safeJson(this.proxy.observability('/hosts', { tenantId }));
    for (const h of (hosts?.hosts ?? []).filter((x: { cpuPct: number }) => x.cpuPct >= 85).slice(0, 2)) {
      recs.push({
        id: `cpu-${h.hostname}`,
        category: 'infrastructure',
        title: `High CPU on ${h.hostname}`,
        description: `CPU at ${h.cpuPct}%. Consider scaling or process review.`,
        priority: h.cpuPct >= 95 ? 'critical' : 'high',
        source: 'host-metrics',
        actionHref: '/observability',
        confidence: 84,
      });
    }

    const slos = await this.safeJson(this.proxy.transactions('/transactions/slos', { tenantId }));
    for (const s of (slos?.slos ?? []).filter((x: { compliant: boolean }) => !x.compliant).slice(0, 2)) {
      recs.push({
        id: `slo-rec-${s.id}`,
        category: 'transactions',
        title: `SLO breach: ${s.name}`,
        description: `${s.currentValue}ms vs ${s.targetValue}ms target on ${s.transactionName}.`,
        priority: 'high',
        source: 'transaction-slos',
        actionHref: '/transactions',
        confidence: 89,
      });
    }

    const apm = await this.safeJson(this.proxy.observability('/apm/summary', { tenantId }));
    if (apm && (apm.services ?? 0) === 0) {
      recs.push({
        id: 'apm-empty',
        category: 'apm',
        title: 'Ingest application traces',
        description: 'No services in the APM map. Send OTLP traces or use demo ingest on /apm.',
        priority: 'low',
        source: 'apm',
        actionHref: '/apm',
        confidence: 80,
      });
    }

    // Optional agent recommendations
    try {
      const agent = await this.proxy.aiAgents('/api/v1/agents/run', {
        method: 'POST',
        body: {
          agent_type: 'predictive',
          tenant_id: tenantId,
          trigger: 'copilot.recommendations',
          context: {},
        },
      });
      if (agent.status < 400 && agent.data && typeof agent.data === 'object' && 'summary' in agent.data) {
        recs.push({
          id: 'predictive-agent',
          category: 'predictive',
          title: 'Predictive insight',
          description: String((agent.data as { summary: string }).summary),
          priority: 'medium',
          source: 'ai-agents',
          actionHref: '/agents',
          confidence: Number((agent.data as { confidence?: number }).confidence ?? 80),
        });
      }
    } catch {
      // optional
    }

    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    return recs.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  }

  private async buildOverview(tenantId: string): Promise<string> {
    const [hosts, banking, slos, apm] = await Promise.all([
      this.safeJson(this.proxy.observability('/hosts', { tenantId })),
      this.safeJson(this.proxy.compliance('/banking360', { tenantId })),
      this.safeJson(this.proxy.transactions('/transactions/slos', { tenantId })),
      this.safeJson(this.proxy.observability('/apm/summary', { tenantId })),
    ]);

    return [
      'OpsEdge360 snapshot:',
      `• Hosts: ${hosts?.totalHosts ?? 0} (avg CPU ${hosts?.avgCpu ?? 0}%)`,
      `• APM services: ${apm?.services ?? apm?.telemetry?.services ?? 0}`,
      `• Transaction SLO compliance: ${slos?.compliancePct ?? 0}%`,
      `• Banking360: ${banking?.enabled ? `active (${banking.bankingScore}%)` : 'inactive'}`,
    ].join('\n');
  }

  private formatRecommendationsReply(recs: Recommendation[]): string {
    if (!recs.length) return 'No recommendations right now — platform looks healthy.';
    return `Top recommendations:\n${recs
      .slice(0, 5)
      .map((r, i) => `${i + 1}. [${r.priority}] ${r.title} — ${r.description}`)
      .join('\n')}`;
  }

  private matches(prompt: string, keywords: string[]): boolean {
    return keywords.some((k) => prompt.includes(k));
  }

  private async safeJson(promise: Promise<{ status: number; data: unknown }>): Promise<any> {
    try {
      const result = await promise;
      if (result.status >= 400) return null;
      return result.data;
    } catch {
      return null;
    }
  }
}
