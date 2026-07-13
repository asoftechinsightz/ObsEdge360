import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ExecutiveDataService } from './executive-data.service';
import { DashboardRulesService } from './dashboard-rules.service';

describe('ExecutiveDataService.composeDashboard (Sprint 1)', () => {
  const service = new ExecutiveDataService({} as never, new DashboardRulesService(), {} as never);

  const baseInput = {
    kpis: {
      availability: 99.95,
      revenueAtRisk: 420_000,
      complianceScore: 91,
      securityPosture: 'medium' as const,
      sustainabilityScore: 80,
      activeIncidents: 2,
      totalAssets: 1200,
      openAlerts: 7,
    },
    trends: { series: [{ day: '2026-07-01', availability: 99.9, activeIncidents: 1, mttrMinutes: 18 }] },
    services: [
      {
        id: 'svc-pay',
        name: 'UPI Payments',
        tier: 1,
        availability: 98.2,
        slaTarget: 99.9,
        status: 'degraded',
        owner: 'Payments SRE',
      },
    ],
    risks: [],
    narrative: {
      what: 'Payment path degraded',
      why: 'UPI latency elevated',
      impact: '₹420K/hr at risk',
      owner: 'Payments SRE',
      next: 'Open incident workspace',
      nextHref: '/ops-intelligence',
      aiConfidence: 0.8,
    },
    recommendations: {
      items: [
        {
          id: 'rec-1',
          title: 'Investigate payment path',
          reason: 'Latency spike',
          action: 'Open',
          href: '/ops-intelligence?workflow=create-incident',
        },
      ],
    },
    estateStats: { totalAssets: 1200, avgHealth: 88, openAlerts: 7, atRiskAssets: 40, byType: [] },
    role: 'cio',
    incidents: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Payment Gateway Failure',
        severity: 'high',
        status: 'investigating',
        drilldown: {
          href: '/ops-intelligence?incident=11111111-1111-1111-1111-111111111111',
          label: 'Open workspace',
        },
      },
    ],
  };

  it('leads health widgets with business outcomes', () => {
    const payload = service.composeDashboard(baseInput);
    assert.equal(payload.health[0]?.id, 'health.business');
    assert.equal(payload.health[1]?.id, 'health.revenue');
    assert.equal(payload.health[2]?.id, 'health.alerts');
  });

  it('uses real incident ids and workspace deep links', () => {
    const payload = service.composeDashboard(baseInput);
    assert.ok(payload.insights.recentIncidents.length >= 1);
    assert.equal(payload.insights.recentIncidents[0].id, '11111111-1111-1111-1111-111111111111');
    assert.match(payload.insights.recentIncidents[0].drilldown?.href || '', /incident=11111111/);
  });

  it('drills services into twin impact with focus', () => {
    const payload = service.composeDashboard(baseInput);
    const row = payload.tables.find((t) => t.id === 'table.services')?.rows?.[0] as { href?: string };
    assert.match(row?.href || '', /\/twin\?workflow=impact/);
    assert.match(row?.href || '', /focus=/);
  });

  it('never emits hash action hrefs', () => {
    const payload = service.composeDashboard(baseInput);
    for (const a of payload.recommendedActions) {
      assert.ok(a.href && a.href !== '#', `bad href ${a.id}`);
    }
  });
});
