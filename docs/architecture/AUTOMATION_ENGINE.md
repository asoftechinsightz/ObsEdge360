# Automation Engine

**Wave:** Phase 5 Wave 4 (`v1.0.0-wave4`)  
**ADR:** ADR-027 (implemented as gateway module for tenant-scoped durable state)

## Capabilities

- Durable workflow definitions with signature hash
- Executions with resumable state and step ledger
- Sequential / parallel / conditional branch steps
- Timeouts, retries, compensation, rollback status
- Simulation mode with zero production mutations
- Policy + approval gates; global emergency stop

## Modes

| Mode | Mutations | Approval |
|------|-----------|----------|
| simulation | None | Optional (auto for auto_execute) |
| dry_run | None (recorded intent) | Per policy |
| live | Controlled record only in Wave 4 (no auto remediator invoke) | Always required |

## Control plane

`automation_control_plane.emergency_stop` immediately blocks new starts and pauses queued/running executions.
