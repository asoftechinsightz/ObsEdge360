# Release Naming Scheme

**Document ID:** OE360-REL-NAME-001  
**Status:** FROZEN  
**Effective:** 2026-07-10  
**Authority:** EAB / Product Owner  

---

## 1. Version line (pre-GA)

| Version | Name | Phase alignment | Status |
|---------|------|-----------------|--------|
| **v0.9.0** | Enterprise Foundation | Phase 0 audit + Sprint 0 foundation | Historical |
| **v0.9.1** | Production Hardening | Phase 1 Harden & Wire (deployed) | **Current** |
| **v0.9.2** | Security Foundation | Phase 2 Enterprise Security & Compliance Foundation | Planned |
| **v0.9.3** | Compliance Foundation | Phase 2 exit / compliance depth (or early Phase 3 overlap) | Planned |
| **v0.9.4** | AI Foundation | Phase 4 AI Platform | Planned |
| **v1.0.0** | Enterprise GA | Post Phase 5/6 readiness criteria | Future |

Patch increments (`v0.9.1.x`) may be used for hotfixes that do not change phase scope.

## 2. Rules

1. Every production deploy tags or records a release id in release notes + PRR.  
2. Marketing/customer communication uses the **Name** column, not internal phase numbers alone.  
3. Phase gates still govern delivery; release names are the external/versioning lens.  
4. Do not claim **v1.0.0 Enterprise GA** until EAB GA checklist is met.

## 3. Current mapping

- Production VPS (2026-07-10): **v0.9.1 Production Hardening** @ `b0f85fa`  
- Next coding train (after plan approval): **v0.9.2 Security Foundation**  
