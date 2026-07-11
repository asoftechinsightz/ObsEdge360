# Phase 4 Wave 4 — Validation

**Script:** `scripts/vps-p4-wave4-validate.sh`  
**Token:** `P4_WAVE4_VALIDATION_OK`

Checks:

- Migration 031 (catalog + audit)
- Catalog list
- Medium dry_run blocked without approval → approve → execute
- Live allowlisted restart → approve → executed_live (controlled)
- Disallowed live rollback rejected
- Low dry_run executes without approval
- Audit trail + cross-tenant isolation
