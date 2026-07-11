# Phase 4 Wave 2 — Implementation

See [SDS-4.2-MultiSignalCorrelation.md](./sds/SDS-4.2-MultiSignalCorrelation.md).

- Engine: `services/observability/src/correlation-engine.service.ts`
- Routes: `/ai/correlate`, `/ai/correlations`, `/ai/correlations/:id`, `/ai/signals/collect`, `/ai/signals/snapshot`
- Gateway: `apps/api-gateway/src/ai.controller.ts`
- UI: `/aiops` — collect signals, correlate, cluster detail with members
- Migration: `029_aiops_multisignal_correlation.sql`
