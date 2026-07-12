# Reference Architecture — Banking / BFSI

**Product:** OpsEdge360 (+ Banking360 pack where enabled)  
**Audience:** Enterprise architects, risk, IT ops  

## Business outcomes

- Payment / digital journey visibility  
- Faster incident narrative for executives  
- Control posture views that complement GRC (not a certification substitute)

## Recommended topology

| Tier | Guidance |
|------|----------|
| Pilot | Compose or single-site K8s, non-prod data |
| Production | HA per `docs/gtm/procurement/HIGH_AVAILABILITY_GUIDE.md` |
| Regulated | Prefer customer VPC / on-prem; SSO via Entra/OIDC/SAML |

## Trust & data

- No unnecessary PII in demos; follow bank data residency  
- MFA required for admin  
- Audit via Admin › Audit  

## Integrations (priority)

Entra ID · OpenTelemetry · ServiceNow/Jira · Teams/Slack notifications · cloud discovery as scoped  

## Success metrics (pilot)

MTTR reduction · synthetic coverage on critical journeys · MFA adoption · executive weekly review attendance  

## Related

`docs/gtm/marketing/briefs/BANKING.md` · procurement compliance matrix · CVP evidence template  
