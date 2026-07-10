# Phase 2 — Rollback Strategy

**Document ID:** OE360-P2-RB-001  
**Status:** PROPOSED  
**Release:** `v0.9.2`  

---

## 1. Principles

1. Prefer **expand/contract** migrations — never edit 001–014.  
2. Feature-flag AuthZ enforcement where feasible for fast disable.  
3. Keep previous container images tagged for quick recreate.  
4. Backup `trinetra360` before every Phase 2 production promote.  

## 2. Rollback triggers

- Auth outage (login or all APIs 401/403 incorrectly)  
- Data leak suspicion (cross-tenant)  
- p95 beyond budget with user impact  
- Critical CVE introduced by dependency bump  

## 3. Application rollback

```text
1. Announce short maintenance if needed
2. docker compose ... pull/tag previous known-good images OR git reset to prior release tag
3. Recreate api-gateway (+ web if session model changed) with --no-deps as needed
4. Verify /health /ready /login
5. Confirm topology/pipeline with valid token
```

Do **not** remove localhost port binds during rollback.

## 4. Data rollback

| Change type | Strategy |
|-------------|----------|
| Additive tables (audit, permissions) | Leave in place (safe) or drop only if unused and approved |
| Backfilled role grants | Restore from pre-deploy SQL dump if corrupt |
| Destructive migration | **Forbidden** in Phase 2 without separate ADR |

Restore drill command pattern (ops): restore dump into isolated DB first; only then consider prod restore under change control.

## 5. Session model rollback (ADR-008)

If HttpOnly/BFF breaks clients: redeploy prior gateway+web pair; clear cookies; communicate re-login.

## 6. Decision authority

SRE Lead may execute application image rollback; Security Architect + Product Owner for AuthZ flag disable affecting compliance posture.
