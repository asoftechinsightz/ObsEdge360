# Enterprise Release Checklist

**Document ID:** OE360-REL-001  
**Status:** FROZEN  
**Effective:** 2026-07-10  

Use for every production or staging release train. Attach completed checklist to the phase PRR or release record.

Legend: ☐ Pending · ☑ Done · N/A

---

## Release metadata

| Field | Value |
|-------|-------|
| Release ID | |
| Phase / version | |
| Commit SHA / tag | |
| Environment | ☐ Staging · ☐ Production |
| Release manager | |
| Date | |

---

## Checklist

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 1 | **Code Freeze** | ☐ | Branch locked; only fixes with EAB exception |
| 2 | **Feature Freeze** | ☐ | No new scope; backlog deferred |
| 3 | **Documentation Freeze** | ☐ | Docs match build; OpenAPI synced |
| 4 | **Security Scan** | ☐ | Trivy/CI; CRITICAL = 0 |
| 5 | **Dependency Scan** | ☐ | Known HIGH reviewed or waived |
| 6 | **Performance Test** | ☐ | p95 targets or waiver |
| 7 | **Backup Verification** | ☐ | Recent successful backup exists |
| 8 | **Rollback Verification** | ☐ | Rollback steps dry-run / tested |
| 9 | **Staging Sign-off** | ☐ | Smoke + checklist owner sign |
| 10 | **Production Sign-off** | ☐ | EAB / ops approval |
| 11 | **Release Notes** | ☐ | Published under `docs/phaseN/` |
| 12 | **Post-release Monitoring** | ☐ | Health, logs, error rate window |

---

## Production lock confirmation

| Lock | Confirmed unchanged (or change-controlled) |
|------|--------------------------------------------|
| Web domain | ☐ |
| API domain | ☐ |
| DB `trinetra360` | ☐ |
| Nginx / SSL | ☐ |
| Docker volume names | ☐ |
| Migrations 001–014 | ☐ |

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering Lead | | |
| Security Architect | | |
| DevOps / SRE | | |
| Product Owner | | |

---

## Related

- `docs/reviews/` PRR · `DEFINITION_OF_DONE.md` · `RISK_REGISTER.md` · `PHASE_GATE_MODEL.md`  
