# Phase 4 Wave 4 — Implementation

See [SDS-4.4-ControlledRemediation.md](./sds/SDS-4.4-ControlledRemediation.md).

- Engine: `services/observability/src/remediation-control.service.ts`
- Routes: request, catalog, approve, reject, execute, audit
- Gateway: `apps/api-gateway/src/ops-intelligence.controller.ts`
- UI: `/ops-intelligence` — request / approve / reject / execute
- Migration: `031_controlled_remediation.sql`
- Policy: `remediation-v1`
