# SLA Guide — OpsEdge360 RC2 Pilot

**Applies to:** Controlled customer pilots / PoCs (not full enterprise contract unless annexed)

## Pilot service targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Platform availability | 99.0% monthly (pilot hours) | Synthetic `/health` + uptime checks |
| API p95 (pilot load ≤100 users) | < 500 ms guidance | Wave7 smoke / APM |
| Severity 1 first response | 1 hour (business hours default) | Ticket timestamps |
| Severity 2 first response | 4 hours | Ticket timestamps |
| Planned maintenance notice | 48 hours | Email to pilot lead |

## Exclusions

- Customer network / IdP outages  
- Demo / presentation plane intentional kill-switches  
- Load above agreed pilot sizing without capacity review  
- Issues from enabling `OPS_MFA_LAB_CODES` or weak JWT secrets contrary to runbook  
- Deferred features (Chromium browser worker, native PDF, full Helm set)

## Measurement notes

- Availability calculated excluding announced maintenance windows.  
- Performance guidance is **modeled** in RC2 reports; contractual capacity claims require Wave7 `CERT_FULL_SCALE` evidence on staging.
