# Identity Integration

Protocols: LDAP, Active Directory, SAML 2.0, OIDC.

- Bind/client secrets via Enterprise Secret Management references only
- JIT provisioning issues JWT with `password_hash = NULL`
- Group/role/attribute mapping on `identity_providers`
- Sync jobs tracked in `identity_sync_jobs`
- Existing `/auth/sso` OIDC/SAML flows remain the login path for those protocols; Wave 5 registry links via `sso_provider_id`
