# Audit Event Schema (Standard) — v1.0 → v1.1 draft

**Document ID:** OE360-AUDIT-SCHEMA-001  
**Status:** v1.0 **FROZEN** in production; **v1.1 DRAFT** pending SDS-2.3 acceptance  
**Storage:** Layer 1 `audit_logs` + `metadata` JSONB; Layer 2 `audit_evidence` (Wave 3)  

## v1.0 required logical fields (current production)

| Field | DB column / metadata | Notes |
|-------|----------------------|-------|
| timestamp | `created_at` | Server time |
| tenantId | `tenant_id` | **UUID** |
| userId | `actor_id` | UUID when user |
| service | `metadata.service` | e.g. `api-gateway` |
| resource | `resource_type` + `resource_id` | |
| action | `action` | e.g. `authz.deny` |
| decision | `metadata.decision` | allow \| deny |
| policy | `metadata.policy` | permission or policy id |
| reason | `metadata.reason` | |
| ip | `ip_address` | |
| userAgent | `metadata.userAgent` | |
| traceId | `metadata.traceId` | |
| correlationId | `correlation_id` | |
| riskScore | `metadata.riskScore` | 0–100 optional |

## v1.1 additions (DRAFT — activate with Wave 3)

| Field | Notes |
|-------|-------|
| eventId | Stable UUID |
| organization | Tenant name/slug |
| role | Actor role at event time |
| permission | Permission string evaluated |
| category | AuthN / AuthZ / … (see SDS-2.3 §5) |
| sessionId | Session family |
| environment | production \| staging \| development |
| controlIds | Compliance control references |
| contentHash | Layer 2 integrity |

Full normative definition: [SDS-2.3-AuditFramework.md](./sds/SDS-2.3-AuditFramework.md) §4.

All future audit emitters MUST conform to the **accepted** schema version at time of merge.
