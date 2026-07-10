# Module & Plugin Principle (Permanent)

**Document ID:** OE360-MOD-001  
**Status:** FROZEN — permanent architecture rule  
**Effective:** 2026-07-11  
**Authority:** EAB Resolution 2026-07-11  

---

## Rule

**Every new enterprise capability must be implemented as a module or plugin, never by tightly coupling it into the platform core.**

The **Core Platform** (gateway security spine, shared libraries, core domain services, tenancy, audit primitives) must remain stable and reusable.

## Applies to

| Capability | ADR / notes |
|------------|-------------|
| Quantum Shield | ADR-016 |
| AI Copilot | ADR-021 |
| Compliance Packs | ADR-012 / ADR-025 |
| Industry Packs | ADR-024 |
| Country Packs | ADR-025 |
| Dashboards / Studio | ADR-017 / ADR-019 |
| Connectors | Plugin framework ADR-020 |
| Workflow Engine | ADR-027 |
| Marketplace | ADR-028 |
| SDK | ADR-028 |
| Notifications | ADR-026 |

## Implications

1. New capabilities declare manifests, permissions, and version compatibility.  
2. Core must boot and operate with zero optional modules installed.  
3. Modules must not bypass gateway AuthZ or patch auth internals without ADR.  
4. Violations require EAB exception (`EXC-*`).  

## Related

`INDUSTRY_SOLUTION_PACKS.md` · ADR-001 · ADR-020 · `FROZEN_ARCHITECTURE.md`  
