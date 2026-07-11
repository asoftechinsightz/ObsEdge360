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
| **v0.9.1** | Enterprise Foundation / Production Hardening | ✅ Current (Phase 1) |
| **v0.9.2** | Enterprise Security & Compliance Foundation | ✅ Complete (`v0.9.2-wave7`) |
| **v0.9.3** | Enterprise Observability Platform | 🟢 In progress — Wave 1 Telemetry |
| **v0.9.4** | AI & Agentic AI Foundation | Planned |
| **v0.9.5** | Dashboard Studio & Workflow Automation | Planned |
| **v0.9.6** | Industry & Country Solution Packs | Planned |
| **v0.9.7** | Marketplace & Plugin SDK | Planned |
| **v1.0.0** | OpsEdge360 Enterprise General Availability | Future |

Hotfixes: `v0.9.2.x` style patches without scope change.

## 3. Rules

1. Every production deploy records a release id in notes + PRR.  
2. External communication uses the **Name** column.  
3. Phase gates still govern delivery.  
4. Do not claim **v1.0.0 GA** until EAB GA checklist is met.  
5. Preview (`v0.9.x`) may ship with tracked operational conditions.

## 5. Roadmap recommendation (not frozen until EAB amends)

Strategic option under discussion: place AI before advanced observability:

| Version | Proposed name |
|---------|----------------|
| v0.9.3 | AI & Agentic AI Foundation |
| v0.9.4 | Advanced Observability & SRE |
| v0.9.5 | Dashboard Studio & Workflow Automation |
| v0.9.6 | Industry & Country Solution Packs |
| v0.9.7 | Marketplace & Plugin SDK |
| v1.0.0 | Enterprise GA |

Formal freeze remains §2 until EAB amends `FROZEN_ROADMAP.md`.
