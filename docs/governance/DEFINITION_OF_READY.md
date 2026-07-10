# Definition of Ready (DoR)

**Document ID:** OE360-DOR-001  
**Status:** FROZEN — binding for all phases  
**Effective:** 2026-07-10  

---

## 1. Purpose

A phase, epic, or feature is **not Ready** to start implementation until every applicable criterion below is satisfied. Starting without Ready status is an EAB exception (`EXC-*`).

---

## 2. Phase-level Definition of Ready

A phase cannot start **implementation** unless:

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | **Requirements approved** | Phase plan / PRD section signed by Product Owner |
| 2 | **ADRs approved** | Phase ADRs **Accepted** by EAB (or explicitly deferred with conditions) |
| 3 | **Architecture reviewed** | EAB architecture review recorded |
| 4 | **UX approved** | UX/UI impact reviewed (or N/A with Product Owner sign-off) |
| 5 | **Database impact reviewed** | Migration plan; no edits to immutable migrations 001–014; impact on `trinetra360` noted |
| 6 | **Security review completed** | Threat notes / security ADRs accepted for phase scope |
| 7 | **Test strategy approved** | Unit, integration, API, security, performance approach documented |
| 8 | **Rollback strategy defined** | Deploy/rollback steps; backup verification plan |
| 9 | **Documentation updated** | Plan, ADRs, architecture notes, gate docs current |
| 10 | **Prior phase exit** | Prior phase PRR PASS or PASS WITH CONDITIONS; DoD met |

**Planning-only work** (draft ADRs, plans, WBS) may begin under Conditional Approval of the prior phase, but **must not** include production code until DoR is met.

---

## 3. Feature / task-level Definition of Ready

| # | Criterion |
|---|-----------|
| 1 | Acceptance criteria written and testable |
| 2 | Dependencies identified (services, APIs, DB, packs) |
| 3 | Security impact classified (none / low / high) |
| 4 | API contract sketched if HTTP surface changes |
| 5 | DB change path known (new migration number or none) |
| 6 | Owner assigned; estimate or milestone slot exists |
| 7 | Linked to phase plan / WBS item |

---

## 4. Phase 2 DoR (current)

| Criterion | Status |
|-----------|--------|
| Phase 1 Approved with Operational Conditions | ✅ |
| Phase 2 planning approved | ✅ |
| Planning pack documents drafted | ✅ (awaiting EAB acceptance) |
| ADR-009 … ADR-018 Accepted | ☐ Proposed — acceptance review open |
| Phase 2 implementation plan approved | ☐ |
| Test / rollback / deploy / threat / perf docs approved | ☐ |
| HLD/LLD v1.1 accepted | ☐ Proposed |

**No Phase 2 production code until this DoR is fully met.**

---

## 5. Related

- `DEFINITION_OF_DONE.md` · `EXECUTIVE_ARCHITECTURE_BOARD.md` · `PHASE_GATE_MODEL.md` · `docs/phase2/PHASE2_GATE.md`  
