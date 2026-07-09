# OpsEdge360 — Administrator Guide

## Initial Setup

1. Deploy platform (see Production Deployment Guide)
2. Configure OIDC/SAML identity provider
3. Create tenant and admin user
4. Configure discovery connectors
5. Enable compliance frameworks
6. Set retention policies

## Tenant Management

```http
POST /api/v1/admin/tenants
{
  "name": "Acme Bank",
  "slug": "acme-bank",
  "region": "ap-south-1",
  "settings": { "retention": { "logs_days": 90 } }
}
```

## User & RBAC

| Role | Typical User |
|------|--------------|
| viewer | Business stakeholders |
| operator | NOC/SRE |
| admin | Platform admin |
| compliance_officer | Audit team |
| ot_engineer | Plant operations |

Assign via Admin UI → Users → Edit Role.

## Discovery Connectors

Admin → Discovery → Add Connector:

| Protocol | Required Config |
|----------|-----------------|
| SSH | host, port, credentials vault ref |
| SNMP | community/v3, OID list |
| Kubernetes | kubeconfig, namespaces |
| AWS | IAM role or access keys (vault) |

**OT connectors**: Enable read-only mode; set rate limits.

## Compliance Configuration

1. Admin → Compliance → Enable frameworks
2. Map controls to tenant scope
3. Set check schedules
4. Configure evidence retention

## AI Agent Policies

Admin → Agents → Policies:
- Set risk tier thresholds
- Configure approval chains (email, Slack)
- Block destructive actions on OT zone

## Audit Export

Admin → Audit → Export (CSV/JSON) for date range.

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| CMDB empty | Verify discovery connector enabled and credentials |
| Twin not updating | Check Kafka `cmdb.updated` consumer lag |
| High false positives | Tune fraud agent baseline sensitivity |
| SSO failure | Verify OIDC redirect URIs and JWKS endpoint |
