# SDS-5.1 — Enterprise Admin Center & Packaging Foundation

**Document ID:** OE360-SDS-5.1  
**Wave:** Phase 5 / Wave 1  
**Release track:** `v1.0.0-wave1` (preview toward GA)  
**Status:** ✅ APPROVED FOR IMPLEMENTATION  
**Depends on:** Phase 4 closed (`v0.9.4-wave5`)

## Objectives

1. Migration **033** enterprise GA tables (licenses, admin settings, quotas, automation policies, runbooks, backup/upgrade runs, integration connectors).
2. Tenant-scoped **Enterprise Administration Center** UI under `/admin` with working APIs.
3. Packaging architecture docs for SaaS / Hybrid / On-Prem; HA and autonomous operations guides.
4. Helm chart templates (installable single-replica baseline — not multi-AZ HA claim).
5. Host upgrade helper script + backup/restore run recording APIs (execution remains host scripts).
6. Validation token **`P5_WAVE1_VALIDATION_OK`**.

## Non-goals

- `P5_GA_VALIDATION_OK` / tag `v1.0.0`
- Multi-node Postgres/Redis/Kafka HA
- Live ServiceNow/Jira/LDAP/Slack delivery
- Autonomous live remediation without approval

## Acceptance

Production script `scripts/vps-p5-wave1-validate.sh` prints `P5_WAVE1_VALIDATION_OK`.
