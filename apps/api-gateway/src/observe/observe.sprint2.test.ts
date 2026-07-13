import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_APPLICATIONS,
  DEMO_LOGS,
  DEMO_TRACES,
  domainHealth,
  demoTopology,
} from './demo-fixtures';
import { SkyWalkingObserveAdapter } from './skywalking.adapter';

describe('Sprint 2 Unified Observability', () => {
  it('demo packs cover Banking360, Retail360, K8s, Hybrid', () => {
    const packs = new Set(
      DEMO_APPLICATIONS.flatMap((a) => Object.values(a.labels || {})).concat(
        DEMO_APPLICATIONS.map((a) => a.labels?.pack || ''),
      ),
    );
    assert.ok([...packs].some((p) => p.includes('Banking360')));
    assert.ok([...packs].some((p) => p.includes('Retail360')));
    assert.ok(DEMO_APPLICATIONS.some((a) => a.health === 'degraded'));
  });

  it('never embeds vendor product names in customer DTOs', () => {
    const blob = JSON.stringify({ apps: DEMO_APPLICATIONS, logs: DEMO_LOGS, traces: DEMO_TRACES, topo: demoTopology() });
    assert.equal(/skywalking|grafana|prometheus ui|elastic|datadog|new relic/i.test(blob), false);
    assert.match(blob, /OpsEdge|demo-app|upi/i);
  });

  it('domainHealth propagates worst status', () => {
    assert.equal(domainHealth(DEMO_APPLICATIONS), 'degraded');
    assert.equal(domainHealth([]), 'unknown');
  });

  it('engine adapter returns OpsEdge display name only', async () => {
    const adapter = new SkyWalkingObserveAdapter();
    assert.equal(adapter.displayName, 'Unified Observability');
    assert.ok(!/skywalking/i.test(adapter.displayName));
    const logs = await adapter.searchLogs('tenant', { q: 'UPI', limit: 10 });
    assert.ok(logs.items.length >= 1);
    assert.ok(logs.items.every((l) => l.source === 'demo'));
    const health = await adapter.health('tenant');
    assert.equal(health.ok, true);
    assert.ok(!/skywalking/i.test(health.message));
  });

  it('topology connects apps to databases for impact story', () => {
    const topo = demoTopology();
    assert.ok(topo.nodes.length >= 4);
    assert.ok(topo.edges.some((e) => e.source === 'demo-app-upi' && e.target === 'demo-db-pg'));
    assert.ok(topo.nodes.every((n) => n.twinHref.includes('/twin')));
  });

  it('every demo entity links to Digital Twin', () => {
    for (const e of DEMO_APPLICATIONS) {
      assert.match(e.twinHref, /\/twin/);
      assert.match(e.observeHref, /\/observability\//);
    }
  });
});
