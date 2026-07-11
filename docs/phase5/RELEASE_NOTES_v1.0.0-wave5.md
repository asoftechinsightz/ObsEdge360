# Release Notes — v1.0.0-wave5

**Phase 5 Wave 5 — Enterprise Integrations & Identity**

## Highlights

- Connector framework (register, secret refs, health/test, retry, circuit breaker, audit)
- ServiceNow & Jira Service Management ITSM paths with idempotency + correlation IDs
- Notification channels: email, Slack, Teams, webhook — templates, rate limits, DLQ
- Identity providers: LDAP, AD, SAML, OIDC with JIT and sync jobs
- Secret reference validation via Enterprise Secret Management
- Admin Center integration pages

## Known limitations

- Live ITSM/notification delivery requires customer-reachable endpoints and secret refs
- LDAP sync parses directory responses at a basic entry-count level (full attribute mapping continues in later waves)
- Observability `notification_channels` (008) remains separate from enterprise notification tables
- Not Enterprise GA

## Ops

- Tag: `v1.0.0-wave5`
- Validation: `P5_WAVE5_VALIDATION_OK`
- Migration: `037_enterprise_integrations.sql`
- Feature SHA: `043ff9be`

## Not claimed

- Enterprise GA · `P5_GA_VALIDATION_OK` · final `v1.0.0`
