# SDS-4.4 — Intelligent Remediation (Controlled Execution)

**Document ID:** OE360-SDS-4.4  
**Wave:** Phase 4 / Wave 4  
**Release:** `v0.9.4`  
**Status:** ✅ CLOSED (`v0.9.4-wave4`)  
**Depends on:** Wave 3 closed (`v0.9.4-wave3`)  
**ADRs:** ADR-021 (human approval for high-risk) · ADR-027 (approval workflows — partial)

## Objectives

1. Honest `execution_mode` persistence (`dry_run` | `live`) — no silent remapping.
2. Human approval gate for medium/high risk and any live execution.
3. Allowlisted live actions with controlled adapter (webhook or audit-only).
4. Tenant isolation on all remediation queries; audit event trail.
5. Backward compatible dry-run path for low-risk dry_run (may execute from `pending`).

## Non-goals

- Full knowledge graph / conversational depth (Wave 4.5)
- OT engineer dual-approval workflows (future)
- Bringing orphaned `:4007` remediation microservice into prod compose

## Migration

**031** — extend `ops_remediation_requests`; add `remediation_action_catalog`, `remediation_audit_events`.

## APIs (additive)

- `POST …/remediation/approvals/:id/approve`
- `POST …/remediation/approvals/:id/reject`
- `GET …/remediation/catalog`
- `GET …/remediation/audit`
- Existing request / list / execute remain; execute enforces policy

## Acceptance

**P4_WAVE4_VALIDATION_OK** in production.
