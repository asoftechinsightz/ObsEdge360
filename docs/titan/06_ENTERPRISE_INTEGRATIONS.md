# 06 — Workstream 6: Enterprise Integrations

**Goal:** Strengthen **existing** integrations. Do not add dozens of new connectors for vanity coverage.

## Priority stack

| Priority | Integration | Focus |
|----------|-------------|--------|
| P0 | Microsoft Entra ID (OIDC/SAML) | SSO harden, sync status, runbooks |
| P0 | OpenTelemetry | Ingest reliability, cardinality hygiene |
| P1 | ServiceNow | Incident/change sync quality |
| P1 | Jira | Issue linkage / workflow |
| P1 | Microsoft Teams / Slack | Notification channels reliability |
| P1 | AWS / Azure / GCP | Discovery/connector health, least privilege |
| P2 | Others | Only with dual-customer evidence |

## Operating surfaces

- `/admin/integrations`, connector catalog/config/health  
- `/admin/identity-providers`, LDAP/SAML/OIDC config  
- `/admin/notification-channels`, delivery history  
- Discovery connectors  

## Hardening checklist (per integration)

- [ ] Auth method documented  
- [ ] Failure modes + retry  
- [ ] Customer runbook section  
- [ ] Health signal visible in admin  
- [ ] Pilot evidence of successful use  
