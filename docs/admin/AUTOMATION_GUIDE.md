# Automation Guide (Admin)

Enterprise controlled automation in Admin Center.

## Pages

- Automation Dashboard
- Workflow Designer
- Runbook Library
- Policy Manager
- Approval Queue
- Execution History
- Simulation Results
- Emergency Stop Console
- Automation History (search + export)

## Rules

1. Emergency stop blocks all new executions.
2. Production / live always requires approval.
3. `auto_execute` never applies to production mode.
4. Simulation never changes production state.

APIs: `/api/v1/automation/*`
