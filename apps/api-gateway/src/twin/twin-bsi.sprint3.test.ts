import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  VENDOR_LEAK_RE,
  availabilityFromHealth,
  healthFromScore,
  priorityFrom,
  propagateHealthFromDependencies,
  recoveryOrderFromNodes,
} from './twin-bsi.helpers';
import type { TwinAiContext, TwinBlastRadiusBusiness, TwinBusinessService } from './twin-bsi.types';

describe('Sprint 3 Twin BSI helpers', () => {
  it('propagates worst dependency health to business service', () => {
    const healthy = propagateHealthFromDependencies([98, 95, 100]);
    assert.equal(healthy.health, 'healthy');
    assert.equal(healthy.healthScore, 95);

    const degraded = propagateHealthFromDependencies([98, 72, 91]);
    assert.equal(degraded.health, 'degraded');
    assert.equal(degraded.healthScore, 72);

    const critical = propagateHealthFromDependencies([88, 40, 99]);
    assert.equal(critical.health, 'critical');
    assert.equal(critical.healthScore, 40);
  });

  it('maps score bands to health vocabulary', () => {
    assert.equal(healthFromScore(90), 'healthy');
    assert.equal(healthFromScore(70), 'degraded');
    assert.equal(healthFromScore(10), 'critical');
    assert.equal(healthFromScore(0), 'unknown');
  });

  it('assigns blast priority from health and revenue', () => {
    assert.equal(priorityFrom('critical', 1000), 'P1');
    assert.equal(priorityFrom('healthy', 150000), 'P1');
    assert.equal(priorityFrom('degraded', 5000), 'P2');
    assert.equal(priorityFrom('healthy', 5000), 'P4');
  });

  it('derives SLA actual from propagated health', () => {
    const actual = availabilityFromHealth(99.9, 70);
    assert.ok(actual < 99.9);
    assert.ok(actual >= 95);
  });

  it('orders recovery data-stores before apps before platforms', () => {
    const order = recoveryOrderFromNodes(
      [
        { name: 'payments-api', ciType: 'application' },
        { name: 'pg-primary', ciType: 'database' },
        { name: 'k8s-mum', ciType: 'kubernetes' },
      ],
      'UPI Payments',
    );
    assert.equal(order[0], 'pg-primary');
    assert.ok(order.includes('payments-api'));
    assert.ok(order.includes('UPI Payments'));
  });

  it('customer DTOs never leak vendor product names', () => {
    const sample: TwinBusinessService = {
      id: 'svc-1',
      name: 'UPI Payments',
      businessUnit: 'Retail Banking',
      businessCapability: 'Real-time Payments',
      environment: 'Prod',
      tier: 1,
      criticality: 'tier1',
      lifecycle: 'active',
      tags: ['banking360', 'twin-bsi'],
      health: 'degraded',
      healthScore: 72,
      riskScore: 40,
      ownership: {
        businessOwner: 'Payments Product',
        operationsOwner: 'Payments SRE',
        onCallTeam: 'Payments On-Call',
      },
      sla: { target: 99.95, actual: 99.7, compliance: 99.7, breachPredicted: true, trend: 'worsening' },
      kpis: {
        availability: 99.7,
        latencyMs: 220,
        errorRate: 1.8,
        incidentCount: 1,
        mttrMinutes: 18,
        slaCompliance: 99.7,
        businessRisk: 'degraded',
        revenueImpactPerHour: 120000,
        customerImpact: 'Elevated friction on journey',
        trend: 'worsening',
        forecastRisk: 'Capacity / dependency pressure next 24h',
      },
      dependencyCount: 4,
      twinHref: '/twin?serviceId=svc-1',
      observeHref: '/observability/applications?focus=UPI',
      asOf: new Date().toISOString(),
    };
    const blast: TwinBlastRadiusBusiness = {
      serviceId: 'svc-1',
      serviceName: 'UPI Payments',
      depth: 3,
      direction: 'downstream',
      affectedServices: ['UPI Payments'],
      affectedApplications: ['payments-api'],
      affectedCustomers: 'Retail + merchant payment corridors',
      businessRisk: 'degraded',
      revenueImpactPerHour: 54000,
      operationalImpact: '2 critical CIs',
      priority: 'P1',
      recoveryOrder: ['pg-primary', 'payments-api', 'UPI Payments'],
      affectedCis: 6,
      criticalCount: 2,
      atRiskCount: 1,
      avgHealth: 78,
      nodes: [],
      edges: [],
      rootCiIds: [],
      asOf: new Date().toISOString(),
    };
    const ai: TwinAiContext = {
      brand: 'OpsEdge360',
      summary: 'Twin analysis for UPI Payments',
      evidence: [{ type: 'blast_radius', ref: 'svc-1', detail: '6 CIs in blast radius' }],
      confidence: 0.82,
      businessImpact: '₹54000/hr',
      affectedServices: ['UPI Payments'],
      rootCause: 'Database dependency degraded',
      recommendedRemediation: ['Restore data stores first'],
      automationRecommendations: ['Propose approved restart'],
      twinHref: '/twin?serviceId=svc-1',
      recoveryOrder: blast.recoveryOrder,
    };
    const blob = JSON.stringify({ sample, blast, ai });
    assert.equal(VENDOR_LEAK_RE.test(blob), false);
    assert.match(blob, /OpsEdge360|UPI Payments|Digital Twin|twin/i);
  });
});
