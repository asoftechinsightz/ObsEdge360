# Phase 5 Wave 3 — Implementation

See [SDS-5.3-PlatformOperationsGovernance.md](./sds/SDS-5.3-PlatformOperationsGovernance.md).

- Migration: `035_platform_governance.sql`
- Service: `apps/api-gateway/src/admin/governance.service.ts`
- Auth hooks: password policy + lockout + session tracking in `auth.service.ts`
- APIs under `/api/v1/admin/{platform,platform-health,settings,quotas,capacity,storage,security-policies,licenses/status,sessions,governance/audit}`
- UI: `/admin/platform`, capacity, storage, quotas, security-policies, sessions, password-policies, governance, settings
