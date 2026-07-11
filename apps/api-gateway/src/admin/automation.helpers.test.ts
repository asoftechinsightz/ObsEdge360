import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertAutoExecuteNotProduction,
  inMaintenanceWindow,
  signWorkflowDefinition,
} from './automation.helpers';

describe('automation.helpers', () => {
  it('signs workflow definitions stably', () => {
    const def = { steps: [{ key: 'a', action: 'x' }] };
    assert.equal(signWorkflowDefinition(def), signWorkflowDefinition(def));
    assert.notEqual(signWorkflowDefinition(def), signWorkflowDefinition({ steps: [] }));
  });

  it('blocks auto_execute production', () => {
    assert.match(assertAutoExecuteNotProduction('auto_execute', 'production') ?? '', /not permitted/);
    assert.equal(assertAutoExecuteNotProduction('auto_execute', 'dry_run'), null);
  });

  it('evaluates maintenance windows', () => {
    const mondayNoon = new Date(Date.UTC(2026, 6, 6, 12, 0));
    assert.equal(inMaintenanceWindow([{ days: [1], startMinute: 0, endMinute: 24 * 60 }], mondayNoon), true);
    assert.equal(inMaintenanceWindow([{ days: [0], startMinute: 0, endMinute: 60 }], mondayNoon), false);
    assert.equal(inMaintenanceWindow([], mondayNoon), true);
  });
});
