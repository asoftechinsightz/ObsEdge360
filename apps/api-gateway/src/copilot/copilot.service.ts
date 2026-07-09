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

  async chat(tenantId: string, messages: CopilotMessage[]): Promise<{
    reply: string;
    recommendations: Recommendation[];
    agentRun?: unknown;
    sources: string[];
  }> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const prompt = (lastUser?.content ?? '').toLowerCase();
    const sources: string[] = [];

    // Intent routing
    if (this.matches(prompt, ['rca', 'root cause', 'why is', 'what caused', 'incident', 'outage', 'latency spike'])) {
      const rca = await this.runRca(tenantId, { question: lastUser?.content ?? '' });
      sources.push('rca', 'observability', 'cmdb');
      return {
        reply: rca.summary,
        recommendations: rca.recommendations,
        agentRun: rca.agentRun,
        sources,
      };
    }

    if (this.matches(prompt, ['recommend', 'suggestion', 'what should', 'improve', 'optimize', 'next step'])) {
      const recs = await this.getRecommendations(tenantId);
      sources.push('recommendations');
      return {
        reply: this.formatRecommendationsReply(recs),
        recommendations: recs,
        sources,
      };
    }

    if (this.matches(prompt, ['compliance', 'rbi', 'pci', 'banking', 'control'])) {
      const banking = await this.safeJson(this.proxy.compliance('/banking360', { tenantId }));
      sources.push('banking360', 'compliance');
      const enabled = banking?.enabled ? 'active' : 'inactive';
      const score = banking?.bankingScore ?? 0;
      return {
        reply: `Banking360 is ${enabled}. Combined RBI/PCI score is ${score}%. RBI: ${banking?.frameworks?.rbi?.score ?? 0}%, PCI: ${banking?.frameworks?.pci?.score ?? 0}%. ${score < 80 ? 'Run validation and remediate failed controls.' : 'Compliance posture looks healthy.'}`,
        recommendations: await this.getRecommendations(tenantId),
        sources,
      };
    }

    if (this.matches(prompt, ['transaction', 'upi', 'slo', 'payment'])) {
      const slos = await this.safeJson(this.proxy.transactions('/transactions/slos', { tenantId }));
      sources.push('transactions');
      return {
        reply: `Payment/transaction SLOs: ${slos?.met ?? 0}/${slos?.totalSlos ?? 0} met (${slos?.compliancePct ?? 0}% compliance). ${slos?.breached ? `${slos.breached} breached — review latency on /transactions.` : 'All tracked SLOs are within target.'}`,
        recommendations: await this.getRecommendations(tenantId),
        sources,
      };
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
    return {
      reply: `${overview}\n\nAsk me about RCA, recommendations, compliance, or payment SLOs.`,
      recommendations: recs.slice(0, 3),
      agentRun,
      sources,
    };
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
