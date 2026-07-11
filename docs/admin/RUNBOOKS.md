# Runbooks

Versioned enterprise runbook catalog (seeded per tenant):

- Restart service / pod / application
- Scale deployment
- Clear cache
- Rotate certificate / secrets
- Database connection reset
- Queue cleanup
- Log collection

Create additional runbooks via `POST /api/v1/automation/runbooks` or Admin → Runbook Library.

Link workflows with `runbookId` and policies with `policyId`.
