# Phase 5 Wave 4 — Implementation

See [SDS-5.4-ControlledAutomationWorkflow.md](./sds/SDS-5.4-ControlledAutomationWorkflow.md).

- Migration: `036_controlled_automation.sql`
- Service: `apps/api-gateway/src/admin/automation.service.ts`
- Controller: `apps/api-gateway/src/admin/automation.controller.ts` → `/api/v1/automation/*`
- Engine: multi-step, branch, parallel, timeout, retry, compensate, rollback, resume; signed definitions; immutable history hashes
- Policies: manual_only / approval_required / maintenance_window / auto_execute (sim/dry_run only) / read_only
- Global emergency stop / pause / resume / cancel queued
- Simulation: predicted changes, dependency impact, duration, rollback preview — no production mutations
- UI: `/admin/automation-dashboard`, workflows, runbooks, policy-manager, approvals, executions, simulations, emergency-stop, automation-history

**Not claimed:** fully autonomous production · `P5_GA_VALIDATION_OK` · `v1.0.0`
