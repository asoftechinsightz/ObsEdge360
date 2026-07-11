# Wave 3 Planning Pack — Audit & Compliance Foundation

**Document ID:** OE360-WAVE3-PLAN-001  
**Status:** 🟡 PLANNING — awaiting SDS-2.3 acceptance  
**Release:** `v0.9.2` (continues Phase 2)  
**Prior checkpoint:** `v0.9.2-wave2` (local tag; push deferred)  
**Coding:** ⏸️ Blocked until SDS-2.3 Accepted  

---

## 1. Purpose

Plan Wave 3 without starting implementation. Aligns EAB dual-layer audit recommendation with delivery, tests, and deploy gates.

## 2. Inputs (accepted)

| Input | Status |
|-------|--------|
| Wave 2 production validated | ✅ Closed |
| Security Baseline v1.0 | ✅ Accepted |
| AUDIT_EVENT_SCHEMA (v1.0) | ✅ Frozen; extend to v1.1 with SDS |
| SDS-2.3 | 🟡 In review |
| ADR-013 Audit logging | ✅ Accepted |
| ADR-012 Compliance rule engine | ✅ Accepted (foundation overlap) |

## 3. Deliverables (planning)

| # | Document | Status |
|---|----------|--------|
| 1 | [SDS-2.3-AuditFramework.md](./sds/SDS-2.3-AuditFramework.md) | In review |
| 2 | This planning pack | Active |
| 3 | Wave 3 WBS (below) | Active |
| 4 | Wave 3 test outline (below) | Active |
| 5 | Wave 3 deploy/validate outline (below) | Active |
| 6 | Schema v1.1 update | After SDS accept |
| 7 | Push `feature/…` + `v0.9.2-wave2` | After planning complete (EAB) |

## 4. Wave 3 WBS

| ID | Task | Depends | Notes |
|----|------|---------|-------|
| W3-01 | EAB accept SDS-2.3 | — | Gate |
| W3-02 | Migration 017 — event id + indexes + `audit_evidence` | W3-01 | Additive only |
| W3-03 | Extend `AuditEvent` + redaction helpers | W3-01 | shared-security |
| W3-04 | Update AUDIT_EVENT_SCHEMA → v1.1 | W3-03 | Docs |
| W3-05 | Emitters: Authentication | W3-03 | login/refresh/fail |
| W3-06 | Emitters: Authorization allow (sampled) | W3-03 | deny already |
| W3-07 | Emitters: Administration / Policy | W3-03 | |
| W3-08 | L2 dual-write + content_hash | W3-02, W3-03 | |
| W3-09 | `GET /audit/events` search | W3-02 | AuthZ gated |
| W3-10 | Export + compliance export + evidence GET | W3-08, W3-09 | |
| W3-11 | L1 retention purge job | W3-02 | |
| W3-12 | OpenAPI + baseline §4 + WAVE3_COMPLETION | W3-10 | |
| W3-13 | VPS validate + Wave 3 review | W3-12 | Before Wave 4 |

## 5. Test outline

| Class | Cases |
|-------|-------|
| Unit | Schema mapping, hash stability, redaction |
| Integration | Emitter → L1 row; dual-write → L2 |
| Negative | Cross-tenant search 403; missing permission 403 |
| Perf smoke | Burst emit &lt; budget; search paged |
| Validation script | `scripts/vps-wave3-validate.sh` (after impl) |

## 6. Deploy / validate outline (post-impl)

1. Commit on feature branch  
2. Bundle deploy (same as Wave 2)  
3. Run migrate (017+)  
4. Validate: health, search API, spoof still 403, evidence hash, retention dry-run  
5. Tag `v0.9.2-wave3` only after validation  
6. Update Security Baseline → v1.1  

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Audit volume impacts API latency | Async L2; sample allows; fail-open L1 |
| Scope creep into full GRC | Hard out-of-scope list in SDS |
| Single-store temptation | Dual-layer mandatory in SDS |
| Push too early | Hold remote push until planning pack complete |

## 8. Repository checkpoint (EAB)

**Do not push yet.** When Wave 3 planning is accepted (and SDS-2.3 Accepted), push together:

- Branch: `feature/sprint0-enterprise-foundation`  
- Tag: `v0.9.2-wave2`  

Creates a clean architectural checkpoint before Wave 3 code.

## 9. Roadmap note (non-binding)

After Wave 3, reassess order of AI vs advanced observability vs deeper compliance using **customer feedback**. Do not freeze v0.9.3+ order in this pack.

## 10. Decision required from EAB

1. **Accept / revise** SDS-2.3 (especially dual-layer minimum for Wave 3).  
2. **Confirm** push timing after planning acceptance.  
3. **Authorize** Wave 3 coding only after SDS Accepted.
