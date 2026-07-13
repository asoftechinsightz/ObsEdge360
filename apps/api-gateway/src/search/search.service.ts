import { Injectable } from '@nestjs/common';
import { query } from '@opsedge360/shared-db';
import { emitAudit } from '@opsedge360/shared-security';
import type { JwtPayload } from '../auth/auth.service';

export type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  category: string;
};

export type SearchCategory = {
  id: string;
  label: string;
  results: SearchResultItem[];
};

@Injectable()
export class SearchService {
  async search(tenantId: string, user: JwtPayload, q: string, limit = 8): Promise<{
    query: string;
    total: number;
    categories: SearchCategory[];
  }> {
    const term = q.trim();
    if (term.length < 2) {
      return { query: term, total: 0, categories: [] };
    }

    const like = `%${term.replace(/[%_]/g, '')}%`;
    const per = Math.min(Math.max(limit, 3), 20);

    const [cis, incidents, users, reports, transactions] = await Promise.all([
      query<{ id: string; name: string; ci_type: string; status: string }>(
        `SELECT id, name, ci_type, status FROM configuration_items
         WHERE tenant_id=$1 AND (name ILIKE $2 OR COALESCE(external_id,'') ILIKE $2 OR ci_type ILIKE $2)
         ORDER BY name ASC LIMIT $3`,
        [tenantId, like, per],
      ).catch(() => []),
      query<{ id: string; title: string; severity: string; status: string }>(
        `SELECT id, title, severity, status FROM ops_incidents
         WHERE tenant_id=$1 AND (title ILIKE $2 OR COALESCE(correlation_key,'') ILIKE $2 OR status ILIKE $2)
         ORDER BY created_at DESC NULLS LAST LIMIT $3`,
        [tenantId, like, per],
      ).catch(() => []),
      query<{ id: string; email: string; name: string | null }>(
        `SELECT id, email, name FROM users
         WHERE tenant_id=$1 AND (email ILIKE $2 OR COALESCE(name,'') ILIKE $2)
         ORDER BY email ASC LIMIT $3`,
        [tenantId, like, per],
      ).catch(() => []),
      query<{ id: string; title: string; report_type: string }>(
        `SELECT id, title, report_type FROM executive_reports
         WHERE tenant_id=$1 AND (title ILIKE $2 OR report_type ILIKE $2)
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, like, per],
      ).catch(() => []),
      query<{ id: string; name: string; classification: string; status: string }>(
        `SELECT id, name, classification, status FROM business_transactions
         WHERE tenant_id=$1 AND (name ILIKE $2 OR classification ILIKE $2)
         ORDER BY name ASC LIMIT $3`,
        [tenantId, like, per],
      ).catch(() => []),
    ]);

    const hrefForCi = (ciType: string, id: string) => {
      const t = ciType.toLowerCase();
      if (t.includes('network')) return `/network?ci=${id}`;
      if (t.includes('business') || t === 'service') return `/transactions?service=${id}`;
      return `/cmdb?ci=${id}`;
    };

    const categories: SearchCategory[] = [];

    if (cis.length) {
      categories.push({
        id: 'cmdb',
        label: 'CMDB / Estate',
        results: cis.map((r) => ({
          id: r.id,
          title: r.name,
          subtitle: `${r.ci_type} · ${r.status}`,
          href: hrefForCi(r.ci_type, r.id),
          category: r.ci_type.includes('server') || r.ci_type.includes('host') ? 'servers' : 'cmdb',
        })),
      });
    }

    if (incidents.length) {
      categories.push({
        id: 'incidents',
        label: 'Incidents / Alerts',
        results: incidents.map((r) => ({
          id: r.id,
          title: r.title,
          subtitle: `${r.severity} · ${r.status}`,
          href: `/ops-intelligence?incident=${r.id}`,
          category: 'incidents',
        })),
      });
    }

    if (transactions.length) {
      categories.push({
        id: 'transactions',
        label: 'Business Services / Transactions',
        results: transactions.map((r) => ({
          id: r.id,
          title: r.name,
          subtitle: `${r.classification} · ${r.status}`,
          href: `/transactions/${encodeURIComponent(r.classification)}`,
          category: 'services',
        })),
      });
    }

    if (users.length) {
      categories.push({
        id: 'users',
        label: 'Users',
        results: users.map((r) => ({
          id: r.id,
          title: r.name || r.email,
          subtitle: r.email,
          href: `/admin/sessions?user=${r.id}`,
          category: 'users',
        })),
      });
    }

    if (reports.length) {
      categories.push({
        id: 'reports',
        label: 'Reports',
        results: reports.map((r) => ({
          id: r.id,
          title: r.title,
          subtitle: r.report_type,
          href: `/reports?id=${r.id}`,
          category: 'reports',
        })),
      });
    }

    // Static operational workspaces matching the query (topology, twin, compliance, security)
    const workspaces = [
      { id: 'ws-observe', title: 'Unified Observability', subtitle: 'Apps, logs, metrics, traces', href: '/observability', keys: ['observability', 'logs', 'metrics', 'traces', 'apm', 'otlp'] },
      { id: 'ws-observe-apps', title: 'Applications', subtitle: 'Application health', href: '/observability/applications', keys: ['applications', 'app health'] },
      { id: 'ws-observe-logs', title: 'Log Explorer', subtitle: 'Enterprise logs', href: '/observability/logs', keys: ['logs', 'log explorer'] },
      { id: 'ws-observe-traces', title: 'Traces', subtitle: 'Distributed tracing', href: '/observability/traces', keys: ['traces', 'tracing', 'spans'] },
      { id: 'ws-topology', title: 'Topology', subtitle: 'Dependency map', href: '/observability/topology', keys: ['topology', 'dependency', 'graph'] },
      { id: 'ws-twin', title: 'Digital Twin', subtitle: 'Impact simulation', href: '/twin', keys: ['twin', 'digital', 'impact', 'blast'] },
      { id: 'ws-compliance', title: 'Compliance Workspace', subtitle: 'Frameworks & controls', href: '/compliance', keys: ['compliance', 'control', 'audit', 'policy'] },
      { id: 'ws-security', title: 'Security Operations', subtitle: 'Findings & posture', href: '/security', keys: ['security', 'siem', 'fraud', 'posture', 'finding'] },
      { id: 'ws-drift', title: 'CMDB Drift', subtitle: 'Configuration drift', href: '/cmdb/drift', keys: ['drift', 'change', 'config'] },
      { id: 'ws-automation', title: 'Automation Catalog', subtitle: 'Workflows & runbooks', href: '/admin/workflows', keys: ['automation', 'workflow', 'runbook'] },
    ];
    const qLower = term.toLowerCase();
    const wsHits = workspaces.filter((w) => w.keys.some((k) => k.includes(qLower) || qLower.includes(k) || w.title.toLowerCase().includes(qLower)));
    if (wsHits.length) {
      categories.push({
        id: 'workspaces',
        label: 'Workspaces',
        results: wsHits.map((w) => ({
          id: w.id,
          title: w.title,
          subtitle: w.subtitle,
          href: w.href,
          category: 'workspace',
        })),
      });
    }

    const total = categories.reduce((n, c) => n + c.results.length, 0);

    void emitAudit({
      tenantId,
      eventCategory: 'data_access',
      eventType: 'enterprise_search',
      action: 'search.query',
      actor: user.sub,
      actorType: 'user',
      outcome: 'success',
      metadata: { query: term, total },
    }).catch(() => undefined);

    return { query: term, total, categories };
  }
}
