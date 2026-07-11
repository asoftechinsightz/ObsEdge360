# Autonomous Operations (Controlled)

**Phase:** 5  
**Principle:** No autonomous production execution without policy approval.

## Foundations (Phase 4 Wave 4)

- Remediation catalog, approvals, dry_run / live modes  
- Allowlisted live adapter (webhook or audit-only)

## Wave 1 additions

- `automation_policies` with `execution_mode` ∈ {dry_run, simulation, production}  
- `require_approval` mandatory for production mode  
- `emergency_stop` flag per policy  
- `runbook_definitions` metadata linked to future execution

## Future waves

- Workflow engine (ADR-027)  
- Simulation / production run orchestration  
- Full execution history + rollback automation
