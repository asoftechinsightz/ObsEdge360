# Phase Gate Model (Permanent Governance)

**Document ID:** OE360-GATE-001  
**Status:** FROZEN — applies to every phase  
**Effective:** 2026-07-10  

---

## 1. Mandatory sequence (every phase)

```text
Planning
    ↓
Architecture Review (ADRs)
    ↓
Implementation
    ↓
Unit Testing
    ↓
Integration Testing
    ↓
Security Review
    ↓
Performance Review
    ↓
Production Readiness Review (PRR)
    ↓
Documentation Review
    ↓
Executive / Role Sign-off
    ↓
Next Phase (plan + ADRs only, then code after approval)
```

**No skipping gates.** “Code complete” is not phase complete.

---

## 2. Artifacts required per phase

| Gate | Minimum artifact |
|------|------------------|
| Planning | `docs/phaseN/PHASEN_IMPLEMENTATION_PLAN.md` |
| Architecture | `docs/adr/ADR-*.md` accepted |
| Implementation | Commits on feature branch; DoD per task |
| Unit testing | CI / `npm test` evidence |
| Integration testing | Smoke / compose evidence |
| Security review | Checklist or security section in PRR |
| Performance review | PRR performance section |
| PRR | `docs/reviews/PHASEN_PRODUCTION_READINESS_REVIEW.md` |
| Documentation | Release notes, API, architecture updates |
| Sign-off | Signed PRR + completion audit |
| Lessons learned | `docs/phaseN/PHASEN_LESSONS_LEARNED.md` |

---

## 3. Phase 2 entry rule (current)

Phase 2 may begin **planning and ADRs** only after Phase 1 PRR is **PASS** or **PASS WITH CONDITIONS**.

Phase 2 **production code** may begin only after:

1. Phase 1 final approval (PRR + checklist)  
2. Phase 2 ADRs accepted  
3. Phase 2 implementation plan approved  

See `docs/phase2/PHASE2_GATE.md`.

---

## 4. Production locks (all phases)

Domains, `trinetra360`, Nginx/SSL, volume names, migrations 001–014 remain change-controlled. Backward compatibility is mandatory unless an approved versioned break.

---

## 5. Definition of Done

All work must satisfy `docs/governance/DEFINITION_OF_DONE.md`.

## 6. Definition of Ready

No phase implementation starts until `docs/governance/DEFINITION_OF_READY.md` is met.

## 7. Release Governance Framework

All phases follow `docs/governance/RELEASE_GOVERNANCE_FRAMEWORK.md`, including EAB, coding standards, release checklist, and risk/debt registers.
