# Definition of Done (DoD)

**Document ID:** OE360-DOD-001  
**Status:** FROZEN — binding for all phases  
**Effective:** 2026-07-10  
**Authority:** Executive Architecture Board / Release Governance Framework  

---

## 1. Purpose

A task, feature, milestone, or phase deliverable is **not Done** unless every applicable criterion below is satisfied. “Code merged” or “demo works on laptop” alone is insufficient.

---

## 2. Feature-level Definition of Done

Every feature must satisfy:

| # | Criterion | Description |
|---|-----------|-------------|
| 1 | **Functional requirements complete** | Acceptance criteria met; no production placeholders where real behavior was required |
| 2 | **Unit tests pass** | Unit coverage for changed logic; CI green for affected packages |
| 3 | **Integration tests pass** | Service/compose integration or equivalent smoke for the change |
| 4 | **API tests pass** | Contract/API checks for new or changed HTTP surfaces |
| 5 | **Security review complete** | Authn/authz, secrets, OWASP-relevant risks reviewed; no Critical open |
| 6 | **Performance benchmarks met** | Phase/feature targets met or waiver logged in Risk Register |
| 7 | **Documentation updated** | Module, phase, ops, and user docs updated as needed |
| 8 | **OpenAPI updated** | New/changed APIs reflected in OpenAPI / Swagger |
| 9 | **Database migrations validated** | New numbered migrations only; applied cleanly; compatibility noted |
| 10 | **Rollback tested** | Rollback or reverse path verified or dry-run documented |
| 11 | **Deployment guide updated** | Deploy docs accurate for the change |
| 12 | **Production ready** | Deployable via documented path; production locks respected; no Critical/High bugs (or EAB waiver) |

**Also required (task hygiene):**

| # | Criterion |
|---|-----------|
| 13 | **No Critical bugs** open for the change |
| 14 | **No High bugs** open (or written EAB/Security waiver) |

**Rule:** If any applicable row fails → status remains **In Progress** / **Blocked**, not Done.

---

## 3. Milestone-level Definition of Done

- All included features meet feature DoD  
- Milestone acceptance criteria from the phase plan are met  
- Platform remains **runnable/deployable** after the milestone  
- Architecture/technical docs updated for that milestone  

---

## 4. Phase-level Definition of Done

A phase is Done only when:

1. All phase exit criteria are evidenced  
2. Unit + integration + API validation complete  
3. Security review complete (phase-scoped)  
4. Performance review complete (phase-scoped)  
5. **Production Readiness Review (PRR)** recorded as PASS or PASS WITH CONDITIONS  
6. Documentation review complete  
7. Release checklist completed for the phase release train  
8. Executive / role sign-off recorded  
9. Lessons Learned filed  
10. Risk & technical debt registers updated  
11. Next-phase gate document updated  

**Conditional Approval** may cover implementation completeness; **Final Phase Approval** requires PRR + operational evidence.

---

## 5. Explicit non-Done examples

| Situation | Done? |
|-----------|-------|
| Feature works locally; no tests | **No** |
| API added; OpenAPI not updated | **No** |
| DB changed by editing old migration | **No** |
| CI red / Critical bug open | **No** |
| Docs claim production route that gateway does not expose | **No** |
| Rollback never considered | **No** |
| Deploy guide stale after compose/API change | **No** |

---

## 6. Waivers

High-severity waivers require written justification, owner, due date, Security Architect or Chief Architect approval, and a PRR/Risk Register link.

Critical-severity waivers for production release require EAB quorum + executive sponsor.

---

## 7. Related governance

- `DEFINITION_OF_READY.md` · `PHASE_GATE_MODEL.md` · `RELEASE_CHECKLIST.md`  
- `EXECUTIVE_ARCHITECTURE_BOARD.md` · `docs/reviews/` · `FROZEN_ROADMAP.md`  
