# Audit Event Schema (Standard)

**Document ID:** OE360-AUDIT-SCHEMA-001  
**Status:** FROZEN for `v0.9.2+`  
**Storage:** `audit_logs` + `metadata` JSONB for extended fields  

## Required logical fields

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

All future audit emitters MUST conform to this schema.
