# Phase 2 — Deployment Plan

**Document ID:** OE360-P2-DEP-001  
**Status:** PROPOSED  
**Release:** `v0.9.2` Security Foundation  
**Environment:** Production VPS `leadedge360` / staging first when available  

---

## 1. Preconditions

- [ ] Phase 2 planning pack + ADRs **Accepted**  
- [ ] Fresh `trinetra360` backup verified  
- [ ] Phase 1 OC-1…OC-3 progress reviewed  
- [ ] Disk &lt; 90% (critical); plan if still in warning (≥80%)  
- [ ] Localhost binds still in effect for 5432/6379/9092/4000  
- [ ] Release notes drafted for `v0.9.2`  

## 2. Order of operations

1. **Staging** (preferred): deploy full Phase 2 build; run security + perf tests.  
2. **Production change window:** notify stakeholders.  
3. Backup DB → record path in PRR.  
4. Deploy code (git tag / bundle) preserving `.env` and TLS mounts.  
5. Run additive migrations only.  
6. Recreate gateway → services → web → nginx (no volume wipes).  
7. Smoke: health/ready/live/version/metrics; login; RBAC negative; tenant negative.  
8. Monitor 30–60 minutes (error rate, CPU, disk).  
9. Complete Release Checklist + Phase 2 PRR.  

## 3. Production locks (unchanged)

Domains, DB name, Nginx/SSL paths, Docker volume names, migrations 001–014.

## 4. Communication

| Audience | Message |
|----------|---------|
| Internal | Change window + rollback contact |
| Customers (if applicable) | Security foundation release notes — no breaking API claims unless true |

## 5. Abort criteria

Any Critical security defect, auth outage, or failed smoke → execute `PHASE2_ROLLBACK_STRATEGY.md`.
