# Release Naming Scheme

**Document ID:** OE360-REL-NAME-001  
**Status:** FROZEN  
**Effective:** 2026-07-11 (updated per EAB)  
**Authority:** EAB / Product Owner  

---

## 1. Semantic release governance (from v0.9.2 onward)

| Version pattern | Meaning |
|-----------------|--------|
| **v0.9.x** | Enterprise Preview |
| **v1.0.0** | General Availability (GA) |
| **v1.x** | Backward-compatible feature releases |
| **v2.x** | Major architecture changes |

## 2. Enterprise milestone roadmap

| Version | Name | Status |
|---------|------|--------|
| **v0.9.1** | Enterprise Foundation / Production Hardening | ✅ Complete |
| **v0.9.2** | Enterprise Security & Compliance Foundation | ✅ Complete (`v0.9.2-wave7`) |
| **v0.9.3** | Enterprise Observability Platform | ✅ Complete (`v0.9.3-wave6`) |
| **v0.9.4** | AI & Agentic AI Foundation | ✅ Complete (`v0.9.4-wave5`) |
| **v0.9.5–v0.9.7** | Folded into Phase 5 GA program (Studio/packs/marketplace as GA waves as needed) | Superseded by Phase 5 plan |
| **v1.0.0-waveN** | Phase 5 preview waves toward GA | 🟢 In progress |
| **v1.0.0** | OpsEdge360 Enterprise General Availability | Future — only after `P5_GA_VALIDATION_OK` |

Hotfixes: `v0.9.2.x` / `v1.0.0.x` style patches without scope change.

## 3. Rules

1. Every production deploy records a release id in notes + PRR.  
2. External communication uses the **Name** column.  
3. Phase gates still govern delivery.  
4. Do not claim **v1.0.0 GA** until EAB GA checklist is met and `P5_GA_VALIDATION_OK`.  
5. Preview (`v0.9.x` / `v1.0.0-waveN`) may ship with tracked operational conditions.

## 5. Phase 5 amendment (EAB 2026-07-11)

Phase 5 is **Enterprise GA & Autonomous Operations** targeting **`v1.0.0`**. Intermediate tags are `v1.0.0-waveN`. Prior §5 “AI before observability” recommendation is **retired** (delivery already shipped observability as v0.9.3 and AI as v0.9.4).
