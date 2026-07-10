import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mountOpsEndpoints, type OpsApp, type OpsRouteHandler } from './ops-endpoints';

function createFakeApp() {
  const routes = new Map<string, OpsRouteHandler>();
  const app: OpsApp = {
    get(path, handler) {
      routes.set(path, handler);
      return app;
    },
  };
  return { app, routes };
}

describe('mountOpsEndpoints', () => {
  it('registers health ready live version metrics', () => {
    const { app, routes } = createFakeApp();
    mountOpsEndpoints(app, { service: 'test-svc', version: '9.9.9' });
    assert.ok(routes.has('/health'));
    assert.ok(routes.has('/ready'));
    assert.ok(routes.has('/live'));
    assert.ok(routes.has('/version'));
    assert.ok(routes.has('/metrics'));
  });

  it('can skip health when includeHealth is false', () => {
    const { app, routes } = createFakeApp();
    mountOpsEndpoints(app, { service: 'test-svc', includeHealth: false });
    assert.equal(routes.has('/health'), false);
    assert.ok(routes.has('/ready'));
  });
});
