# Phase 5 Wave 5 — Implementation

See [SDS-5.5-EnterpriseIntegrationsIdentity.md](./sds/SDS-5.5-EnterpriseIntegrationsIdentity.md).

- Migration: `037_enterprise_integrations.sql`
- Service: `apps/api-gateway/src/admin/integrations.service.ts`
- Controller: `/api/v1/integrations/*`
- Framework: retry, circuit breaker, rate limit, signed webhooks, secret refs
- ITSM: ServiceNow + Jira (idempotent, correlation IDs)
- Notifications: email/slack/teams/webhook with DLQ
- Identity: LDAP/AD/SAML/OIDC registry + LDAP JIT (no local password)

**Not claimed:** GA · `P5_GA_VALIDATION_OK` · `v1.0.0`
