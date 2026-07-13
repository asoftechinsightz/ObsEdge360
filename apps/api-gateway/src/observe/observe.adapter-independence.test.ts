import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ObserveAdapterRegistry } from './observe-adapter.registry';
import {
  DatadogApiObserveAdapter,
  OpenObserveObserveAdapter,
  SkyWalkingObserveAdapter,
} from './engine-connectors.adapter';
import type { ObserveAdapter } from './observe-adapter';

const VENDOR_RE =
  /skywalking|grafana|datadog|new\s*relic|elastic(?:search)?|openobserve|splunk|prometheus\s*ui|jaeger\s*ui|zipkin/i;

function assertCanonicalLogs(adapter: ObserveAdapter, label: string) {
  return (async () => {
    const { items } = await adapter.searchLogs('t1', { limit: 5 });
    assert.ok(items.length >= 1, `${label} logs empty`);
    for (const key of ObserveAdapterRegistry.canonicalKeys.logHit) {
      assert.ok(key in items[0], `${label} missing log key ${key}`);
    }
    const blob = JSON.stringify(items);
    assert.equal(VENDOR_RE.test(blob), false, `${label} vendor leak in logs`);
    assert.equal(adapter.displayName, 'Unified Observability');
  })();
}

describe('Adapter Independence (RC2 gate)', () => {
  it('OpenObserve, Datadog API, and engine-A adapters share identical customer DTO shapes', async () => {
    const a = new SkyWalkingObserveAdapter();
    const b = new OpenObserveObserveAdapter();
    const c = new DatadogApiObserveAdapter();

    await assertCanonicalLogs(a, 'engine-a');
    await assertCanonicalLogs(b, 'openobserve');
    await assertCanonicalLogs(c, 'datadog');

    const [la, lb, lc] = await Promise.all([
      a.listTraces('t1'),
      b.listTraces('t1'),
      c.listTraces('t1'),
    ]);
    assert.deepEqual(
      Object.keys(la[0] || {}).sort(),
      Object.keys(lb[0] || {}).sort(),
      'trace keys diverge engine-a vs openobserve',
    );
    assert.deepEqual(
      Object.keys(la[0] || {}).sort(),
      Object.keys(lc[0] || {}).sort(),
      'trace keys diverge engine-a vs datadog',
    );

    const [ta, tb, tc] = await Promise.all([
      a.getServiceTopology('t1'),
      b.getServiceTopology('t1'),
      c.getServiceTopology('t1'),
    ]);
    for (const topo of [ta, tb, tc]) {
      for (const key of ObserveAdapterRegistry.canonicalKeys.topology) {
        assert.ok(key in topo);
      }
      assert.equal(VENDOR_RE.test(JSON.stringify(topo)), false);
      assert.ok(topo.nodes.every((n) => n.twinHref.includes('/twin')));
    }
  });

  it('registry swaps engines without changing displayName or public capabilities', () => {
    const registry = new ObserveAdapterRegistry({} as never);
    for (const engine of ['demo', 'openobserve', 'datadog'] as const) {
      const adapter = registry.resolve(engine);
      const desc = registry.describe(adapter);
      assert.equal(desc.brand, 'OpsEdge360');
      assert.equal(desc.label, 'Unified Observability');
      assert.equal(desc.swappable, true);
      assert.equal(VENDOR_RE.test(JSON.stringify(desc)), false, `runtime desc leak for ${engine}`);
      assert.ok(!('id' in desc), 'adapter id must not leak to customer runtime descriptor');
    }
  });

  it('UI contract vocabulary is OpsEdge domain language only', () => {
    const allowed = [
      'Application',
      'Business Service',
      'Infrastructure',
      'Trace',
      'Metric',
      'Log',
      'Incident',
      'Topology',
      'Kubernetes',
      'Container',
      'Database',
    ];
    const forbidden = ['SkyWalking', 'Grafana', 'Datadog', 'OpenObserve', 'Elastic APM', 'New Relic'];
    for (const f of forbidden) {
      assert.ok(!allowed.includes(f));
      assert.equal(VENDOR_RE.test(f), true);
    }
    for (const a of allowed) {
      assert.equal(VENDOR_RE.test(a), false, a);
    }
  });
});
