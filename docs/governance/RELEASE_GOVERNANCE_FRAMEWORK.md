# Release Governance Framework — Index

**Document ID:** OE360-RGF-001  
**Status:** FROZEN — binding for all phases  
**Effective:** 2026-07-10  

Enterprise delivery for OpsEdge360 follows this framework. Phase 2 production code remains **blocked** until Phase 1 PRR + operational evidence are complete and Phase 2 plans/ADRs are accepted.

## Framework documents

| # | Document | Purpose |
|---|----------|---------|
| 1 | [EXECUTIVE_ARCHITECTURE_BOARD.md](./EXECUTIVE_ARCHITECTURE_BOARD.md) | Architecture & ADR approval, tech approval, risk acceptance, exceptions |
| 2 | [DEFINITION_OF_READY.md](./DEFINITION_OF_READY.md) | Entry criteria before a phase/feature starts |
| 3 | [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) | Exit criteria before work is Done |
| 4 | [CODING_STANDARDS.md](./CODING_STANDARDS.md) | Enterprise coding standards |
| 5 | [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | Every release gate checklist |
| 6 | [TECHNICAL_DEBT_REGISTER.md](./TECHNICAL_DEBT_REGISTER.md) | Tracked technical debt |
| 7 | [RISK_REGISTER.md](./RISK_REGISTER.md) | Architecture, security, ops, AI, dependency risks |
| 8 | [SECURITY_BASELINE.md](./SECURITY_BASELINE.md) | Minimum security controls per release |
| 9 | [PERFORMANCE_BASELINE.md](./PERFORMANCE_BASELINE.md) | Latency/resource targets |
| 10 | [DOCUMENTATION_STANDARD.md](./DOCUMENTATION_STANDARD.md) | Doc quality, freeze, versioning |
| 11 | [PHASE_GATE_MODEL.md](./PHASE_GATE_MODEL.md) | Mandatory phase sequence including PRR |
| 12 | [DOCUMENTATION_HIERARCHY.md](./DOCUMENTATION_HIERARCHY.md) | Target docs layout |

## Architecture baseline (frozen v1.0)

`docs/architecture/ARCHITECTURE_BASELINE_v1.0.md` and companions (HLD/LLD/Data/Security/AI/Deployment/Integration). Material changes require ADR + new version — do not edit v1.0 in place.

## Related

- Phase PRR: `docs/reviews/`  
- ADRs: `docs/adr/` (001–025)  
- Phase 2 gate: `docs/phase2/PHASE2_GATE.md`  
